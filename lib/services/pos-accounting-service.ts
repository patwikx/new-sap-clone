import { prisma } from "@/lib/prisma"
import { Prisma, PrismaClient } from "@prisma/client"

export class PosAccountingService {
  /**
   * Posts a POS Order to the General Ledger using configured mappings
   * 
   * @param orderId - The ID of the order to post
   * @param tx - Optional transaction client
   * @returns Promise<{ arInvoice?: any, journalEntry: any }>
   */
  static async postOrderToGl(orderId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma

    // Step 1: Get order with all related data
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        businessUnit: true,
        table: true,
        businessPartner: true,
        items: {
          include: {
            menuItem: {
              include: {
                glMapping: {
                  include: {
                    salesAccount: true,
                    cogsAccount: true,
                    inventoryAccount: true
                  }
                }
              }
            },
            modifiers: true
          }
        },
        payments: {
          include: {
            paymentMethod: {
              include: {
                glMappings: {
                  where: { businessUnitId: orderId }, // This should be the actual businessUnitId
                  include: {
                    glAccount: true
                  }
                }
              }
            }
          }
        },
        discount: {
          include: {
            glAccount: true
          }
        }
      }
    })

    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    if (order.status !== 'PAID') {
      throw new Error(`Order ${orderId} is not in PAID status`)
    }

    if (order.arInvoiceId || order.journalEntryId) {
      throw new Error(`Order ${orderId} has already been posted to GL`)
    }

    // Step 2: Get POS configuration
    const posConfig = await client.posConfiguration.findUnique({
      where: { businessUnitId: order.businessUnitId },
      include: {
        salesRevenueAccount: true,
        salesTaxAccount: true,
        cashAccount: true,
        discountAccount: true,
        serviceChargeAccount: true,
        arInvoiceSeries: true,
        journalEntrySeries: true
      }
    })

    if (!posConfig) {
      throw new Error('POS configuration not found')
    }

    if (!posConfig.autoPostToGl) {
      throw new Error('Auto-posting to GL is not enabled')
    }

    // Step 3: Validate required accounts
    if (!posConfig.salesRevenueAccount && !order.items.every(item => item.menuItem.glMapping?.salesAccount)) {
      throw new Error('Sales revenue account not configured')
    }

    if (!posConfig.salesTaxAccount && Number(order.tax) > 0) {
      throw new Error('Sales tax account not configured')
    }

    // Step 4: Get current open accounting period
    const openPeriod = await client.accountingPeriod.findFirst({
      where: {
        businessUnitId: order.businessUnitId,
        status: 'OPEN',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    })

    if (!openPeriod) {
      throw new Error('No open accounting period found')
    }

    // Step 5: Calculate amounts
    const subtotal = Number(order.subTotal || 0)
    const discountAmount = Number(order.discountValue || 0)
    const taxAmount = Number(order.tax || 0)
    const serviceChargeAmount = posConfig.enableServiceCharge 
      ? subtotal * Number(posConfig.serviceChargeRate) / 100 
      : 0
    const totalAmount = Number(order.totalAmount)

    let arInvoice = null
    let journalEntry = null

    // Step 6: Create AR Invoice if enabled
    if (posConfig.autoCreateArInvoice && posConfig.arInvoiceSeries) {
      const arDocNum = `${posConfig.arInvoiceSeries.prefix}${posConfig.arInvoiceSeries.nextNumber.toString().padStart(5, '0')}`

      await client.numberingSeries.update({
        where: { id: posConfig.arInvoiceSeriesId! },
        data: { nextNumber: posConfig.arInvoiceSeries.nextNumber + 1 }
      })

      arInvoice = await client.aRInvoice.create({
        data: {
          docNum: arDocNum,
          documentDate: new Date(),
          postingDate: new Date(),
          dueDate: new Date(), // Immediate for POS
          totalAmount: new Prisma.Decimal(totalAmount),
          amountPaid: new Prisma.Decimal(totalAmount),
          status: 'CLOSED',
          settlementStatus: 'SETTLED',
          businessUnitId: order.businessUnitId,
          bpCode: order.businessPartner?.bpCode || posConfig.defaultCustomerBpCode,
          remarks: `POS Order ${order.id}`,
          items: {
            create: order.items.map(item => {
              const lineTotal = Number(item.priceAtSale) * item.quantity
              return {
                description: item.menuItem.name,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: item.priceAtSale,
                lineTotal: new Prisma.Decimal(lineTotal),
                menuItemId: item.menuItemId,
                glAccountId: item.menuItem.glMapping?.salesAccountId || posConfig.salesRevenueAccountId!
              }
            })
          }
        }
      })
    }

    // Step 7: Create Journal Entry
    if (posConfig.journalEntrySeries) {
      const jeDocNum = `${posConfig.journalEntrySeries.prefix}${posConfig.journalEntrySeries.nextNumber.toString().padStart(5, '0')}`

      await client.numberingSeries.update({
        where: { id: posConfig.journalEntrySeriesId! },
        data: { nextNumber: posConfig.journalEntrySeries.nextNumber + 1 }
      })

      journalEntry = await client.journalEntry.create({
        data: {
          docNum: jeDocNum,
          documentDate: new Date(),
          postingDate: new Date(),
          memo: `POS Sale - Order ${order.id}`,
          referenceNumber: order.id,
          businessUnitId: order.businessUnitId,
          authorId: order.userId,
          accountingPeriodId: openPeriod.id,
          approvalWorkflowStatus: 'POSTED',
          isPosted: true,
          postedAt: new Date(),
          postedById: order.userId
        }
      })

      // Step 8: Create Journal Entry Lines
      const journalLines: Prisma.JournalEntryLineCreateManyInput[] = []

      // Debit: Payment Method Accounts
      for (const payment of order.payments) {
        const paymentMapping = payment.paymentMethod.glMappings.find(
          mapping => mapping.businessUnitId === order.businessUnitId
        )
        
        const glAccount = paymentMapping?.glAccount || posConfig.cashAccount
        
        if (!glAccount) {
          throw new Error(`No GL account found for payment method ${payment.paymentMethod.name}`)
        }

        journalLines.push({
          journalEntryId: journalEntry.id,
          glAccountId: glAccount.id,
          debit: new Prisma.Decimal(Number(payment.amount)),
          credit: null,
          description: `POS Payment - ${payment.paymentMethod.name}`
        })
      }

      // Credit: Revenue Accounts (by menu item or default)
      const revenueByAccount = new Map<string, { account: any, amount: number }>()
      
      for (const item of order.items) {
        const lineTotal = Number(item.priceAtSale) * item.quantity
        const glAccount = item.menuItem.glMapping?.salesAccount || posConfig.salesRevenueAccount
        
        if (!glAccount) {
          throw new Error(`No sales GL account found for menu item ${item.menuItem.name}`)
        }
        
        if (revenueByAccount.has(glAccount.id)) {
          revenueByAccount.get(glAccount.id)!.amount += lineTotal
        } else {
          revenueByAccount.set(glAccount.id, {
            account: glAccount,
            amount: lineTotal
          })
        }
      }

      for (const [accountId, { account, amount }] of revenueByAccount) {
        journalLines.push({
          journalEntryId: journalEntry.id,
          glAccountId: account.id,
          debit: null,
          credit: new Prisma.Decimal(amount),
          description: `POS Sales Revenue`
        })
      }

      // Credit: Tax Account
      if (taxAmount > 0 && posConfig.salesTaxAccount) {
        journalLines.push({
          journalEntryId: journalEntry.id,
          glAccountId: posConfig.salesTaxAccount.id,
          debit: null,
          credit: new Prisma.Decimal(taxAmount),
          description: `POS Sales Tax`
        })
      }

      // Debit: Discount Account (if applicable)
      if (discountAmount > 0 && posConfig.discountAccount) {
        journalLines.push({
          journalEntryId: journalEntry.id,
          glAccountId: posConfig.discountAccount.id,
          debit: new Prisma.Decimal(discountAmount),
          credit: null,
          description: `POS Discount`
        })
      }

      // Credit: Service Charge Account (if applicable)
      if (serviceChargeAmount > 0 && posConfig.serviceChargeAccount) {
        journalLines.push({
          journalEntryId: journalEntry.id,
          glAccountId: posConfig.serviceChargeAccount.id,
          debit: null,
          credit: new Prisma.Decimal(serviceChargeAmount),
          description: `POS Service Charge`
        })
      }

      // Create all journal lines
      await client.journalEntryLine.createMany({
        data: journalLines
      })

      // Step 9: Handle COGS if configured
      await this.processCogs(order, journalEntry.id, client)
    }

    // Step 10: Update order with references
    await client.order.update({
      where: { id: orderId },
      data: {
        arInvoiceId: arInvoice?.id,
        journalEntryId: journalEntry?.id,
        posConfigId: posConfig.id
      }
    })

    return { arInvoice, journalEntry }
  }

  /**
   * Processes Cost of Goods Sold for menu items with recipes
   */
  private static async processCogs(
    order: any, 
    journalEntryId: string, 
    client: Prisma.TransactionClient
  ) {
    const cogsLines: Prisma.JournalEntryLineCreateManyInput[] = []

    for (const item of order.items) {
      if (item.menuItem.recipe && item.menuItem.glMapping?.cogsAccount) {
        let totalCogs = 0

        // Calculate COGS from recipe
        for (const recipeItem of item.menuItem.recipe.recipeItems) {
          const quantityUsed = Number(recipeItem.quantityUsed) * item.quantity
          const standardCost = recipeItem.inventoryItem.standardCost 
            ? Number(recipeItem.inventoryItem.standardCost) 
            : 0
          totalCogs += quantityUsed * standardCost
        }

        if (totalCogs > 0) {
          // Debit: COGS Account
          cogsLines.push({
            journalEntryId,
            glAccountId: item.menuItem.glMapping.cogsAccount.id,
            debit: new Prisma.Decimal(totalCogs),
            credit: null,
            description: `COGS - ${item.menuItem.name}`
          })

          // Credit: Inventory Account
          const inventoryAccount = item.menuItem.glMapping.inventoryAccount
          if (inventoryAccount) {
            cogsLines.push({
              journalEntryId,
              glAccountId: inventoryAccount.id,
              debit: null,
              credit: new Prisma.Decimal(totalCogs),
              description: `Inventory Depletion - ${item.menuItem.name}`
            })
          }
        }
      }
    }

    // Create COGS lines if any
    if (cogsLines.length > 0) {
      await client.journalEntryLine.createMany({
        data: cogsLines
      })
    }
  }

  /**
   * Gets the accounting summary for an order
   */
  static async getOrderAccountingSummary(orderId: string) {
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
        payments: {
          include: {
            paymentMethod: true
          }
        }
      }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    const journalEntry = order.journalEntry || order.arInvoice?.journalEntry

    return {
      orderId: order.id,
      isPosted: !!order.journalEntryId,
      arInvoiceId: order.arInvoiceId,
      journalEntryId: order.journalEntryId,
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subTotal || 0),
      tax: Number(order.tax || 0),
      discount: Number(order.discountValue || 0),
      journalLines: journalEntry?.lines.map(line => ({
        id: line.id,
        accountCode: line.glAccount?.accountCode || 'Unknown',
        accountName: line.glAccount?.name || 'Unknown',
        debit: line.debit ? Number(line.debit) : 0,
        credit: line.credit ? Number(line.credit) : 0,
        description: line.description
      })) || []
    }
  }

  /**
   * Validates POS configuration for GL posting
   */
  static async validateConfiguration(businessUnitId: string) {
    const issues: string[] = []
    const warnings: string[] = []

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
    })

    if (!posConfig) {
      issues.push("POS configuration not found")
      return { isValid: false, issues, warnings }
    }

    // Validate GL accounts
    if (posConfig.autoPostToGl) {
      if (!posConfig.salesRevenueAccountId) {
        issues.push("Default sales revenue account not configured")
      }
      if (!posConfig.salesTaxAccountId) {
        issues.push("Sales tax account not configured")
      }
      if (!posConfig.journalEntrySeriesId) {
        issues.push("Journal entry numbering series not configured")
      }
    }

    if (posConfig.autoCreateArInvoice && !posConfig.arInvoiceSeriesId) {
      issues.push("AR invoice numbering series not configured")
    }

    // Check menu item mappings
    const unmappedMenuItems = await prisma.menuItem.count({
      where: {
        businessUnitId,
        isActive: true,
        glMapping: null
      }
    })

    if (unmappedMenuItems > 0) {
      if (posConfig.autoPostToGl && !posConfig.salesRevenueAccountId) {
        issues.push(`${unmappedMenuItems} menu items missing GL mappings`)
      } else {
        warnings.push(`${unmappedMenuItems} menu items missing GL mappings (will use default)`)
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
    })

    if (unmappedPaymentMethods > 0) {
      if (posConfig.autoPostToGl && !posConfig.cashAccountId) {
        issues.push(`${unmappedPaymentMethods} payment methods missing GL mappings`)
      } else {
        warnings.push(`${unmappedPaymentMethods} payment methods missing GL mappings (will use default)`)
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
    })

    if (!openPeriod && posConfig.autoPostToGl) {
      issues.push("No open accounting period found")
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    }
  }
}

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