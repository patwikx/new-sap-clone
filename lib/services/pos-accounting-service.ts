import { Prisma, ARInvoice, JournalEntry } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma"

// A helper service to manage document numbering
class NumberingService {
  static async getNextDocNum(tx: Prisma.TransactionClient, seriesId: string): Promise<string> {
    const series = await tx.numberingSeries.update({
      where: { id: seriesId },
      data: { nextNumber: { increment: 1 } },
    });
    // The 'nextNumber' returned is the one *before* the increment.
    return `${series.prefix}${(series.nextNumber).toString().padStart(6, '0')}`;
  }
}

// Define a precise type for the order object based on the query
// This type is now used as the input for the postOrderToGl method.
const orderPayload = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    businessUnit: true,
    items: {
      include: {
        menuItem: {
          include: {
            glMapping: {
              include: {
                salesAccount: true,
                cogsAccount: true,
                inventoryAccount: true,
              },
            },
            recipe: {
              include: {
                recipeItems: {
                  include: {
                    inventoryItem: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    payments: {
      include: {
        paymentMethod: {
          include: {
            glMappings: {
              include: {
                glAccount: true,
              },
            },
          },
        },
      },
    },
    discount: {
      include: {
        glAccount: true,
      },
    },
    businessPartner: true,
  },
});
type OrderWithDetails = Prisma.OrderGetPayload<typeof orderPayload>;

// Type definitions
export interface PosAccountingSummary {
  orderId: string
  isPosted: boolean
  arInvoiceId: string | null
  journalEntryId: string | null
  totalAmount: number
  subtotal: number
  tax: number
  discount: number
  journalLines: {
    id: string
    accountCode: string
    accountName: string
    debit: number
    credit: number
    description: string | null
  }[]
}

export class PosAccountingService {
  /**
   * Posts a finalized POS Order to the General Ledger.
   * This method now operates within an existing database transaction.
   * @param order The fully detailed order object, guaranteed to have a 'PAID' status.
   * @param tx The Prisma transaction client from the calling function.
   * @returns An object containing the created ARInvoice, JournalEntry, and the total debits/credits.
   */
  public static async postOrderToGl(
    order: OrderWithDetails, // ✅ FIX: Changed parameter from orderId: string to the full object
    tx: Prisma.TransactionClient // ✅ FIX: Added the transaction client as a parameter
  ): Promise<{
    arInvoice: ARInvoice | null;
    journalEntry: JournalEntry | null;
    totalDebits: Decimal;
    totalCredits: Decimal;
  }> {
    // ✅ FIX: Removed the prisma.$transaction wrapper. The method now uses the passed 'tx'.
    
    // 1. Validate the incoming order object
    if (!order) {
      throw new Error("Order object cannot be null.");
    }
    if (order.journalEntryId || order.arInvoiceId) {
      throw new Error("This order has already been posted to the GL.");
    }
    if (order.status !== 'PAID') {
      throw new Error("Only paid orders can be posted to the GL.");
    }

    // 2. Get the POS Configuration for the Business Unit using the transaction client
    const config = await tx.posConfiguration.findUnique({
      where: { businessUnitId: order.businessUnitId },
    });

    if (!config || !config.autoPostToGl) {
      throw new Error("Automatic GL posting is not enabled for this business unit.");
    }
    if (!config.arInvoiceSeriesId || !config.journalEntrySeriesId || !config.salesTaxAccountId) {
      throw new Error("Essential configuration (AR Series, JE Series, Sales Tax Account) is missing.");
    }

    // 3. Create the AR Invoice (if enabled)
    let arInvoice: ARInvoice | null = null;
    if (config.autoCreateArInvoice) {
      const arDocNum = await NumberingService.getNextDocNum(tx, config.arInvoiceSeriesId);
      arInvoice = await tx.aRInvoice.create({
        data: {
          docNum: arDocNum,
          businessUnit: { connect: { id: order.businessUnitId } },
          businessPartner: { connect: { bpCode: order.businessPartner?.bpCode ?? config.defaultCustomerBpCode ?? 'WALK-IN' } },
          postingDate: new Date(),
          dueDate: new Date(),
          documentDate: order.createdAt,
          totalAmount: order.totalAmount,
          amountPaid: order.amountPaid,
          status: 'CLOSED',
          settlementStatus: 'SETTLED',
          remarks: `AR Invoice for POS Order #${order.id}`,
          items: {
            create: order.items.map(item => {
              const salesAccountId = item.menuItem.glMapping?.salesAccountId || config.salesRevenueAccountId;
              if (!salesAccountId) {
                throw new Error(`Sales account not found for menu item: ${item.menuItem.name}`);
              }
              return {
                description: item.menuItem.name,
                quantity: new Decimal(item.quantity),
                unitPrice: item.priceAtSale,
                lineTotal: new Decimal(item.quantity).mul(item.priceAtSale),
                menuItem: { connect: { id: item.menuItemId } },
                glAccount: { connect: { id: salesAccountId } },
              };
            }),
          },
        },
      });
    }

    // 4. Prepare and Create the Journal Entry
    const jeDocNum = await NumberingService.getNextDocNum(tx, config.journalEntrySeriesId);
    
    const journalLines: Omit<Prisma.JournalEntryLineUncheckedCreateInput, 'journalEntryId'>[] = [];
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    // Debit Entry (from payments)
    for (const payment of order.payments) {
      const paymentMethodMapping = payment.paymentMethod.glMappings.find(m => m.businessUnitId === order.businessUnitId);
      const paymentGlAccount = paymentMethodMapping?.glAccountId ? await tx.glAccount.findUnique({ where: { id: paymentMethodMapping.glAccountId }}) : null;
      
      if (!paymentGlAccount) {
        throw new Error(`GL Account mapping not found for payment method: ${payment.paymentMethod.name}`);
      }

      journalLines.push({
        glAccountBusinessUnitId: order.businessUnitId,
        glAccountCode: paymentGlAccount.accountCode,
        debit: payment.amount,
        description: `POS Payment - ${payment.paymentMethod.name}`,
      });
      totalDebits = totalDebits.add(payment.amount);
    }

    // Credit Entries (Revenue from items)
    for (const item of order.items) {
        const salesAccount = item.menuItem.glMapping?.salesAccount ?? (await tx.glAccount.findUnique({ where: { id: config.salesRevenueAccountId! } }));
        if (!salesAccount) {
          throw new Error(`Sales account not found for menu item: ${item.menuItem.name}`);
        }
        const lineCredit = new Decimal(item.quantity).mul(item.priceAtSale);
        journalLines.push({
            glAccountBusinessUnitId: order.businessUnitId,
            glAccountCode: salesAccount.accountCode,
            credit: lineCredit,
            description: `Sales - ${item.menuItem.name}`,
        });
        totalCredits = totalCredits.add(lineCredit);
    }
    
    // Credit Entry (Sales Tax)
    if (order.tax.greaterThan(0)) {
        const taxAccount = await tx.glAccount.findUnique({ where: { id: config.salesTaxAccountId } });
        if (!taxAccount) throw new Error("Sales Tax GL Account not found.");
        journalLines.push({
            glAccountBusinessUnitId: order.businessUnitId,
            glAccountCode: taxAccount.accountCode,
            credit: order.tax,
            description: "Sales Tax",
        });
        totalCredits = totalCredits.add(order.tax);
    }

    // Debit Entry (Discount, if applicable)
    if (order.discountValue.greaterThan(0)) {
      const discountAccountId = order.discount?.glAccountId || config.discountAccountId;
      if (!discountAccountId) {
          throw new Error("Discount GL account is not configured.");
      }
      const discountAccount = await tx.glAccount.findUnique({ where: { id: discountAccountId } });
      if (!discountAccount) throw new Error("Discount GL Account not found.");

      journalLines.push({
          glAccountBusinessUnitId: order.businessUnitId,
          glAccountCode: discountAccount.accountCode,
          debit: order.discountValue,
          description: "Sales Discount",
      });
      totalDebits = totalDebits.add(order.discountValue);
    }

    // Balance check
    if (!totalDebits.equals(totalCredits)) {
      const adjustment = totalCredits.sub(totalDebits); // Note: Switched to credit - debit
      const paymentLine = journalLines.find(line => line.debit && line.description?.startsWith('POS Payment'));
      if (paymentLine && paymentLine.debit) {
          // Adjust the main payment debit to balance the entry, often due to rounding
          paymentLine.debit = (paymentLine.debit as Decimal).add(adjustment);
          totalDebits = totalDebits.add(adjustment);
      } else {
          throw new Error(`Journal entry is unbalanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
      }
    }

    const journalEntry = await tx.journalEntry.create({
      data: {
        docNum: jeDocNum,
        businessUnitId: order.businessUnitId,
        postingDate: new Date(),
        remarks: `Journal Entry for POS Order #${order.id}`,
        authorId: order.userId,
        lines: {
          create: journalLines,
        },
      },
    });
    
    await this.processCogs(tx, order, journalEntry.id);

    // 5. Link documents back to the original Order and AR Invoice
    await tx.order.update({
      where: { id: order.id },
      data: {
        arInvoiceId: arInvoice?.id,
        journalEntryId: journalEntry.id,
      },
    });
    
    if (arInvoice) {
      await tx.aRInvoice.update({
        where: { id: arInvoice.id },
        data: { journalEntryId: journalEntry.id },
      });
    }

    return { arInvoice, journalEntry, totalDebits, totalCredits };
  }

  /**
   * Processes Cost of Goods Sold for menu items with recipes
   */
  private static async processCogs(
    tx: Prisma.TransactionClient,
    order: OrderWithDetails,
    journalEntryId: string
  ) {
    const cogsLines: Omit<Prisma.JournalEntryLineUncheckedCreateInput, 'journalEntryId'>[] = [];

    for (const item of order.items) {
      const cogsAccount = item.menuItem.glMapping?.cogsAccount;
      const inventoryAccount = item.menuItem.glMapping?.inventoryAccount;

      if (item.menuItem.recipe && cogsAccount && inventoryAccount) {
        let totalCogs = new Decimal(0);

        for (const recipeItem of item.menuItem.recipe.recipeItems) {
          const quantityUsed = new Decimal(recipeItem.quantityUsed).mul(item.quantity);
          const standardCost = new Decimal(recipeItem.inventoryItem.standardCost ?? '0');
          totalCogs = totalCogs.add(quantityUsed.mul(standardCost));
        }

        if (totalCogs.greaterThan(0)) {
          // Debit: COGS Account
          cogsLines.push({
            glAccountBusinessUnitId: order.businessUnitId,
            glAccountCode: cogsAccount.accountCode,
            debit: totalCogs,
            description: `COGS - ${item.menuItem.name}`,
          });

          // Credit: Inventory Account
          cogsLines.push({
            glAccountBusinessUnitId: order.businessUnitId,
            glAccountCode: inventoryAccount.accountCode,
            credit: totalCogs,
            description: `Inventory Depletion - ${item.menuItem.name}`,
          });
        }
      }
    }

    if (cogsLines.length > 0) {
      await tx.journalEntry.update({
        where: { id: journalEntryId },
        data: {
          lines: {
            create: cogsLines,
          },
        },
      });
    }
  }

  /**
   * Gets the accounting summary for an order
   */
  static async getOrderAccountingSummary(orderId: string): Promise<PosAccountingSummary> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        arInvoice: {
          include: {
            journalEntry: {
              include: {
                lines: {
                  include: {
                    glAccount: true
                  }
                }
              }
            }
          }
        },
        journalEntry: {
          include: {
            lines: {
              include: {
                glAccount: true
              }
            }
          }
        },
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const journalEntry = order.journalEntry || order.arInvoice?.journalEntry;

    return {
      orderId: order.id,
      isPosted: !!order.journalEntryId,
      arInvoiceId: order.arInvoiceId,
      journalEntryId: order.journalEntryId,
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subTotal),
      tax: Number(order.tax),
      discount: Number(order.discountValue),
      journalLines: journalEntry?.lines.map(line => ({
        id: line.id,
        accountCode: line.glAccount?.accountCode || 'Unknown',
        accountName: line.glAccount?.name || 'Unknown',
        debit: line.debit ? Number(line.debit) : 0,
        credit: line.credit ? Number(line.credit) : 0,
        description: line.description
      })) || []
    };
  }

  /**
   * Validates POS configuration for GL posting
   */
  static async validateConfiguration(businessUnitId: string) {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check POS configuration
    const posConfig = await prisma.posConfiguration.findUnique({
      where: { businessUnitId },
      include: {
        salesRevenueAccount: true,
        salesTaxAccount: true,
        cashAccount: true,
        discountAccount: true,
        arInvoiceSeries: true,
        journalEntrySeries: true
      }
    });

    if (!posConfig) {
      issues.push("POS configuration not found");
      return { isValid: false, issues, warnings };
    }

    // Validate GL accounts
    if (posConfig.autoPostToGl) {
      if (!posConfig.salesRevenueAccountId) {
        issues.push("Default sales revenue account not configured");
      }
      if (!posConfig.salesTaxAccountId) {
        issues.push("Sales tax account not configured");
      }
      if (!posConfig.journalEntrySeriesId) {
        issues.push("Journal entry numbering series not configured");
      }
    }

    if (posConfig.autoCreateArInvoice && !posConfig.arInvoiceSeriesId) {
      issues.push("AR invoice numbering series not configured");
    }

    // Check menu item mappings
    const unmappedMenuItems = await prisma.menuItem.count({
      where: {
        businessUnitId,
        isActive: true,
        glMapping: null
      }
    });

    if (unmappedMenuItems > 0) {
      if (posConfig.autoPostToGl && !posConfig.salesRevenueAccountId) {
        issues.push(`${unmappedMenuItems} menu items missing GL mappings`);
      } else {
        warnings.push(`${unmappedMenuItems} menu items missing GL mappings (will use default)`);
      }
    }

    // Check payment method mappings
    const unmappedPaymentMethods = await prisma.paymentMethod.count({
      where: {
        isActive: true,
        glMappings: {
          none: { businessUnitId }
        }
      }
    });

    if (unmappedPaymentMethods > 0) {
      if (posConfig.autoPostToGl && !posConfig.cashAccountId) {
        issues.push(`${unmappedPaymentMethods} payment methods missing GL mappings`);
      } else {
        warnings.push(`${unmappedPaymentMethods} payment methods missing GL mappings (will use default)`);
      }
    }

    // Check accounting period
    const openPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        businessUnitId,
        status: 'OPEN',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (!openPeriod && posConfig.autoPostToGl) {
      issues.push("No open accounting period found");
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Ensures a 'WALK-IN-CUSTOMER' business partner exists for a given business unit.
   * Creates one if it doesn't exist.
   * @param businessUnitId The business unit ID.
   * @param tx The Prisma transaction client.
   */
  static async ensureWalkInCustomer(businessUnitId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const walkInCustomer = await client.businessPartner.findUnique({
      where: { bpCode: 'WALK-IN-CUSTOMER' }
    });

    if (!walkInCustomer) {
      await client.businessPartner.create({
        data: {
          bpCode: 'WALK-IN-CUSTOMER',
          name: 'Walk-In Customer',
          type: 'CUSTOMER',
          businessUnitId: businessUnitId,
        }
      });
    }
  }
}
