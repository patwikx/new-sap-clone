import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export class AccountingService {
  /**
   * Posts a POS Order to the General Ledger
   * Creates AR Invoice and Journal Entry with proper accounting treatment
   * 
   * @param orderId - The ID of the order to post
   * @returns Promise<{ arInvoice: ARInvoice, journalEntry: JournalEntry }>
   */
  static async postOrderToGl(orderId: string) {
    return await prisma.$transaction(async (tx) => {
      // Step 1: Fetch and validate the order
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          businessUnit: true,
          table: true,
          businessPartner: true,
          items: {
            include: {
              menuItem: {
                include: {
                  salesGlAccount: true,
                  cogsGlAccount: true,
                  recipe: {
                    include: {
                      recipeItems: {
                        include: {
                          inventoryItem: {
                            include: {
                              stockLevels: {
                                include: {
                                  location: true
                                }
                              }
                            }
                          }
                        }
                      }
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
                  glAccount: true
                }
              }
            }
          },
          discount: true
        }
      })

      if (!order) {
        throw new Error(`Order ${orderId} not found`)
      }

      if (order.status !== 'PAID') {
        throw new Error(`Order ${orderId} is not in PAID status`)
      }

      if (order.arInvoiceId) {
        throw new Error(`Order ${orderId} has already been posted to GL`)
      }

      if (!order.payments || order.payments.length === 0) {
        throw new Error(`Order ${orderId} has no payment records`)
      }

      // Step 2: Get numbering series for AR Invoice
      const arNumberingSeries = await tx.numberingSeries.findFirst({
        where: {
          businessUnitId: order.businessUnitId,
          documentType: 'AR_INVOICE'
        }
      })

      if (!arNumberingSeries) {
        throw new Error('No numbering series found for AR invoices')
      }

      const arDocNum = `${arNumberingSeries.prefix}${arNumberingSeries.nextNumber.toString().padStart(5, '0')}`

      // Step 3: Get numbering series for Journal Entry
      const jeNumberingSeries = await tx.numberingSeries.findFirst({
        where: {
          businessUnitId: order.businessUnitId,
          documentType: 'JOURNAL_ENTRY'
        }
      })

      if (!jeNumberingSeries) {
        throw new Error('No numbering series found for journal entries')
      }

      const jeDocNum = `${jeNumberingSeries.prefix}${jeNumberingSeries.nextNumber.toString().padStart(5, '0')}`

      // Step 4: Get current open accounting period
      const openPeriod = await tx.accountingPeriod.findFirst({
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
      const subtotal = Number(order.subTotal)
      const discountAmount = Number(order.discountValue)
      const taxAmount = Number(order.tax)
      const totalAmount = Number(order.totalAmount)

      // Step 6: Validate payment method GL accounts
      for (const payment of order.payments) {
        if (!payment.paymentMethod.glAccount) {
          throw new Error(`Payment method ${payment.paymentMethod.name} does not have a GL account configured`)
        }
      }

      // Step 7: Validate menu item GL accounts
      for (const item of order.items) {
        if (!item.menuItem.salesGlAccount) {
          throw new Error(`Menu item ${item.menuItem.name} does not have a sales GL account configured`)
        }
      }

      // Step 8: Get tax payable account (assuming VAT for now)
      const taxPayableAccount = await tx.glAccount.findFirst({
        where: {
          businessUnitId: order.businessUnitId,
          accountCode: { startsWith: '2' }, // Liability accounts
          name: { contains: 'Tax', mode: 'insensitive' }
        }
      })

      if (!taxPayableAccount && taxAmount > 0) {
        throw new Error('No tax payable account found for tax posting')
      }

      // Step 9: Update numbering series
      await tx.numberingSeries.update({
        where: { id: arNumberingSeries.id },
        data: { nextNumber: arNumberingSeries.nextNumber + 1 }
      })

      await tx.numberingSeries.update({
        where: { id: jeNumberingSeries.id },
        data: { nextNumber: jeNumberingSeries.nextNumber + 1 }
      })

      // Step 10: Create AR Invoice
      const arInvoice = await tx.aRInvoice.create({
        data: {
          docNum: arDocNum,
          documentDate: new Date(),
          postingDate: new Date(),
          dueDate: new Date(), // Immediate payment for POS
          totalAmount: new Prisma.Decimal(totalAmount),
          amountPaid: new Prisma.Decimal(totalAmount), // Fully paid
          status: 'CLOSED', // Closed since it's paid
          settlementStatus: 'SETTLED', // Settled since it's paid
          businessUnitId: order.businessUnitId,
          bpCode: order.businessPartner?.bpCode || 'WALK-IN-CUSTOMER',
          remarks: `POS Order ${order.id}`,
          items: {
            create: order.items.map(item => {
              const lineTotal = Number(item.priceAtSale) * item.quantity
              return {
                description: item.menuItem.name,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: item.priceAtSale,
                lineTotal: new Prisma.Decimal(lineTotal),
                itemCode: item.menuItem.id,
                glAccountId: item.menuItem.salesGlAccount!.id
              }
            })
          }
        },
        include: {
          items: {
            include: {
              glAccount: true
            }
          }
        }
      })

      // Step 11: Create Journal Entry
      const journalEntry = await tx.journalEntry.create({
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
          postedById: order.userId,
          sourceSystem: 'POS'
        }
      })

      // Step 12: Create Journal Entry Lines
      const journalLines: Prisma.JournalEntryLineCreateManyInput[] = []

      // Debit: Cash/Payment Method Account(s)
      for (const payment of order.payments) {
        const paymentAmount = Number(payment.amount)
        journalLines.push({
          journalEntryId: journalEntry.id,
          glAccountBusinessUnitId: order.businessUnitId,
          glAccountCode: payment.paymentMethod.glAccount!.accountCode,
          debit: new Prisma.Decimal(paymentAmount),
          credit: null,
          description: `POS Payment - ${payment.paymentMethod.name}`,
          currency: order.businessUnit.functionalCurrency,
          entityType: 'ORDER',
          entityId: order.id,
          createdById: order.userId
        })
      }

      // Credit: Revenue Account(s) - Group by GL Account
      const revenueByAccount = new Map<string, { account: any, amount: number }>()
      
      for (const item of order.items) {
        const lineTotal = Number(item.priceAtSale) * item.quantity
        const accountId = item.menuItem.salesGlAccount!.id
        const accountCode = item.menuItem.salesGlAccount!.accountCode
        
        if (revenueByAccount.has(accountId)) {
          revenueByAccount.get(accountId)!.amount += lineTotal
        } else {
          revenueByAccount.set(accountId, {
            account: item.menuItem.salesGlAccount!,
            amount: lineTotal
          })
        }
      }

      for (const [accountId, { account, amount }] of revenueByAccount) {
        journalLines.push({
          journalEntryId: journalEntry.id,
          glAccountBusinessUnitId: order.businessUnitId,
          glAccountCode: account.accountCode,
          debit: null,
          credit: new Prisma.Decimal(amount),
          description: `POS Sales Revenue`,
          currency: order.businessUnit.functionalCurrency,
          entityType: 'ORDER',
          entityId: order.id,
          createdById: order.userId
        })
      }

      // Credit: Tax Payable Account (if applicable)
      if (taxAmount > 0 && taxPayableAccount) {
        journalLines.push({
          journalEntryId: journalEntry.id,
          glAccountBusinessUnitId: order.businessUnitId,
          glAccountCode: taxPayableAccount.accountCode,
          debit: null,
          credit: new Prisma.Decimal(taxAmount),
          description: `POS Sales Tax`,
          currency: order.businessUnit.functionalCurrency,
          entityType: 'ORDER',
          entityId: order.id,
          createdById: order.userId
        })
      }

      // Create all journal lines
      await tx.journalEntryLine.createMany({
        data: journalLines
      })

      // Step 13: Handle Cost of Goods Sold (COGS) if recipes exist
      const cogsLines: Prisma.JournalEntryLineCreateManyInput[] = []
      
      for (const item of order.items) {
        if (item.menuItem.recipe && item.menuItem.cogsGlAccount) {
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
              journalEntryId: journalEntry.id,
              glAccountBusinessUnitId: order.businessUnitId,
              glAccountCode: item.menuItem.cogsGlAccount.accountCode,
              debit: new Prisma.Decimal(totalCogs),
              credit: null,
              description: `COGS - ${item.menuItem.name}`,
              currency: order.businessUnit.functionalCurrency,
              entityType: 'ORDER',
              entityId: order.id,
              createdById: order.userId
            })

            // Credit: Inventory Account (simplified - using first available inventory account)
            const inventoryAccount = await tx.glAccount.findFirst({
              where: {
                businessUnitId: order.businessUnitId,
                accountType: { name: 'ASSET' },
                name: { contains: 'Inventory', mode: 'insensitive' }
              }
            })

            if (inventoryAccount) {
              cogsLines.push({
                journalEntryId: journalEntry.id,
                glAccountBusinessUnitId: order.businessUnitId,
                glAccountCode: inventoryAccount.accountCode,
                debit: null,
                credit: new Prisma.Decimal(totalCogs),
                description: `Inventory Depletion - ${item.menuItem.name}`,
                currency: order.businessUnit.functionalCurrency,
                entityType: 'ORDER',
                entityId: order.id,
                createdById: order.userId
              })
            }
          }
        }
      }

      // Create COGS lines if any
      if (cogsLines.length > 0) {
        await tx.journalEntryLine.createMany({
          data: cogsLines
        })
      }

      // Step 14: Link documents
      await tx.aRInvoice.update({
        where: { id: arInvoice.id },
        data: { journalEntryId: journalEntry.id }
      })

      await tx.order.update({
        where: { id: orderId },
        data: { arInvoiceId: arInvoice.id }
      })

      // Step 15: Validate journal entry is balanced
      const allLines = await tx.journalEntryLine.findMany({
        where: { journalEntryId: journalEntry.id }
      })

      const totalDebits = allLines.reduce((sum, line) => 
        sum + (line.debit ? Number(line.debit) : 0), 0)
      const totalCredits = allLines.reduce((sum, line) => 
        sum + (line.credit ? Number(line.credit) : 0), 0)

      if (Math.abs(totalDebits - totalCredits) >= 0.01) {
        throw new Error(`Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`)
      }

      // Step 16: Update GL account balances (optional - can be done via views/computed fields)
      for (const line of allLines) {
        const account = await tx.glAccount.findUnique({
          where: {
            businessUnitId_accountCode: {
              businessUnitId: line.glAccountBusinessUnitId,
              accountCode: line.glAccountCode
            }
          }
        })

        if (account) {
          const debitAmount = line.debit ? Number(line.debit) : 0
          const creditAmount = line.credit ? Number(line.credit) : 0
          
          // Update balance based on normal balance
          const balanceChange = account.normalBalance === 'DEBIT' 
            ? debitAmount - creditAmount 
            : creditAmount - debitAmount

          await tx.glAccount.update({
            where: { id: account.id },
            data: {
              balance: {
                increment: new Prisma.Decimal(balanceChange)
              }
            }
          })
        }
      }

      return {
        arInvoice,
        journalEntry,
        totalDebits,
        totalCredits
      }
    })
  }

  /**
   * Validates that all required GL accounts are configured for POS operations
   * 
   * @param businessUnitId - The business unit to validate
   * @returns Promise<{ isValid: boolean, missingAccounts: string[] }>
   */
  static async validatePosGlConfiguration(businessUnitId: string) {
    const missingAccounts: string[] = []

    // Check if payment methods have GL accounts
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      include: { glAccount: true }
    })

    for (const method of paymentMethods) {
      if (!method.glAccount) {
        missingAccounts.push(`Payment Method: ${method.name} - Missing GL Account`)
      }
    }

    // Check if menu items have sales GL accounts
    const menuItems = await prisma.menuItem.findMany({
      where: { 
        businessUnitId,
        isActive: true 
      },
      include: { 
        salesGlAccount: true,
        cogsGlAccount: true,
        recipe: {
          include: {
            recipeItems: true
          }
        }
      }
    })

    for (const item of menuItems) {
      if (!item.salesGlAccount) {
        missingAccounts.push(`Menu Item: ${item.name} - Missing Sales GL Account`)
      }
      
      // Check COGS account if item has recipe
      if (item.recipe && item.recipe.recipeItems.length > 0 && !item.cogsGlAccount) {
        missingAccounts.push(`Menu Item: ${item.name} - Missing COGS GL Account (has recipe)`)
      }
    }

    // Check for tax payable account
    const taxAccount = await prisma.glAccount.findFirst({
      where: {
        businessUnitId,
        accountType: { name: 'LIABILITY' },
        name: { contains: 'Tax', mode: 'insensitive' }
      }
    })

    if (!taxAccount) {
      missingAccounts.push('Tax Payable Account - Not found')
    }

    // Check for inventory account (if COGS is used)
    const inventoryAccount = await prisma.glAccount.findFirst({
      where: {
        businessUnitId,
        accountType: { name: 'ASSET' },
        name: { contains: 'Inventory', mode: 'insensitive' }
      }
    })

    const hasRecipeItems = menuItems.some(item => 
      item.recipe && item.recipe.recipeItems.length > 0)

    if (!inventoryAccount && hasRecipeItems) {
      missingAccounts.push('Inventory Asset Account - Not found (required for COGS)')
    }

    return {
      isValid: missingAccounts.length === 0,
      missingAccounts
    }
  }

  /**
   * Creates a walk-in customer if one doesn't exist
   * 
   * @param businessUnitId - The business unit ID
   * @returns Promise<BusinessPartner>
   */
  static async ensureWalkInCustomer(businessUnitId: string) {
    const walkInCustomer = await prisma.businessPartner.findFirst({
      where: {
        businessUnitId,
        bpCode: 'WALK-IN-CUSTOMER'
      }
    })

    if (walkInCustomer) {
      return walkInCustomer
    }

    return await prisma.businessPartner.create({
      data: {
        bpCode: 'WALK-IN-CUSTOMER',
        name: 'Walk-in Customer',
        type: 'CUSTOMER',
        businessUnitId
      }
    })
  }

  /**
   * Reverses a posted order (creates reversing journal entry)
   * 
   * @param orderId - The ID of the order to reverse
   * @returns Promise<JournalEntry>
   */
  static async reverseOrderPosting(orderId: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          arInvoice: {
            include: {
              journalEntry: {
                include: {
                  lines: true
                }
              }
            }
          }
        }
      })

      if (!order || !order.arInvoice?.journalEntry) {
        throw new Error('Order or related journal entry not found')
      }

      const originalJE = order.arInvoice.journalEntry

      // Get numbering series for reversal
      const jeNumberingSeries = await tx.numberingSeries.findFirst({
        where: {
          businessUnitId: order.businessUnitId,
          documentType: 'JOURNAL_ENTRY'
        }
      })

      if (!jeNumberingSeries) {
        throw new Error('No numbering series found for journal entries')
      }

      const reversalDocNum = `${jeNumberingSeries.prefix}${jeNumberingSeries.nextNumber.toString().padStart(5, '0')}`

      await tx.numberingSeries.update({
        where: { id: jeNumberingSeries.id },
        data: { nextNumber: jeNumberingSeries.nextNumber + 1 }
      })

      // Create reversing journal entry
      const reversalJE = await tx.journalEntry.create({
        data: {
          docNum: reversalDocNum,
          documentDate: new Date(),
          postingDate: new Date(),
          memo: `Reversal of POS Sale - Order ${order.id}`,
          referenceNumber: `REV-${order.id}`,
          businessUnitId: order.businessUnitId,
          authorId: order.userId,
          accountingPeriodId: originalJE.accountingPeriodId!,
          approvalWorkflowStatus: 'POSTED',
          isPosted: true,
          postedAt: new Date(),
          postedById: order.userId,
          isReversingEntry: true,
          reversedFromEntryId: originalJE.id,
          sourceSystem: 'POS'
        }
      })

      // Create reversing lines (flip debits and credits)
      const reversalLines = originalJE.lines.map(line => ({
        journalEntryId: reversalJE.id,
        glAccountBusinessUnitId: line.glAccountBusinessUnitId,
        glAccountCode: line.glAccountCode,
        debit: line.credit, // Flip
        credit: line.debit, // Flip
        description: `Reversal: ${line.description}`,
        currency: line.currency,
        entityType: line.entityType,
        entityId: line.entityId,
        createdById: order.userId
      }))

      await tx.journalEntryLine.createMany({
        data: reversalLines
      })

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      })

      return reversalJE
    })
  }

  /**
   * Gets the accounting summary for an order
   * 
   * @param orderId - The order ID
   * @returns Promise<AccountingSummary>
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
        payments: {
          include: {
            paymentMethod: {
              include: {
                glAccount: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    return {
      orderId: order.id,
      isPosted: !!order.arInvoiceId,
      arInvoiceId: order.arInvoiceId,
      journalEntryId: order.arInvoice?.journalEntryId,
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subTotal),
      tax: Number(order.tax),
      discount: Number(order.discountValue),
      journalLines: order.arInvoice?.journalEntry?.lines.map(line => ({
        id: line.id,
        accountCode: line.glAccountCode,
        accountName: line.glAccount?.name,
        debit: line.debit ? Number(line.debit) : 0,
        credit: line.credit ? Number(line.credit) : 0,
        description: line.description
      })) || []
    }
  }
}

// Type definitions for return values
export interface AccountingSummary {
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
    accountName: string | undefined
    debit: number
    credit: number
    description: string | null
  }[]
}