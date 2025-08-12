import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export class GlService {
  /**
   * Gets account balances for a business unit as of a specific date
   * 
   * @param businessUnitId - The business unit ID
   * @param asOfDate - The date to calculate balances (default: today)
   * @returns Promise<AccountBalance[]>
   */
  static async getAccountBalances(businessUnitId: string, asOfDate?: Date) {
    const cutoffDate = asOfDate || new Date()

    const accounts = await prisma.glAccount.findMany({
      where: {
        businessUnitId,
        isActive: true
      },
      include: {
        accountType: true,
        journalLines: {
          where: {
            journalEntry: {
              postingDate: { lte: cutoffDate },
              isPosted: true
            }
          }
        }
      },
      orderBy: {
        accountCode: 'asc'
      }
    })

    return accounts.map(account => {
      const totalDebits = account.journalLines.reduce((sum, line) => 
        sum + (line.debit ? Number(line.debit) : 0), 0)
      const totalCredits = account.journalLines.reduce((sum, line) => 
        sum + (line.credit ? Number(line.credit) : 0), 0)

      const balance = account.normalBalance === 'DEBIT' 
        ? totalDebits - totalCredits 
        : totalCredits - totalDebits

      return {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.name,
        accountType: account.accountType.name,
        normalBalance: account.normalBalance,
        balance,
        totalDebits,
        totalCredits,
        asOfDate: cutoffDate
      }
    })
  }

  /**
   * Creates a manual journal entry
   * 
   * @param data - Journal entry data
   * @returns Promise<JournalEntry>
   */
  static async createJournalEntry(data: {
    businessUnitId: string
    authorId: string
    documentDate: Date
    postingDate: Date
    memo?: string
    referenceNumber?: string
    lines: {
      glAccountId: string
      description: string
      debit?: number
      credit?: number
    }[]
  }) {
    return await prisma.$transaction(async (tx) => {
      // Validate lines balance
      const totalDebits = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
      const totalCredits = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

      if (Math.abs(totalDebits - totalCredits) >= 0.01) {
        throw new Error('Journal entry lines must balance')
      }

      // Get numbering series
      const numberingSeries = await tx.numberingSeries.findFirst({
        where: {
          businessUnitId: data.businessUnitId,
          documentType: 'JOURNAL_ENTRY'
        }
      })

      if (!numberingSeries) {
        throw new Error('No numbering series found for journal entries')
      }

      const docNum = `${numberingSeries.prefix}${numberingSeries.nextNumber.toString().padStart(5, '0')}`

      // Get open accounting period
      const openPeriod = await tx.accountingPeriod.findFirst({
        where: {
          businessUnitId: data.businessUnitId,
          status: 'OPEN',
          startDate: { lte: data.postingDate },
          endDate: { gte: data.postingDate }
        }
      })

      if (!openPeriod) {
        throw new Error('No open accounting period found for the posting date')
      }

      // Update numbering series
      await tx.numberingSeries.update({
        where: { id: numberingSeries.id },
        data: { nextNumber: numberingSeries.nextNumber + 1 }
      })

      // Get GL accounts to validate and get codes
      const glAccountIds = data.lines.map(line => line.glAccountId)
      const glAccounts = await tx.glAccount.findMany({
        where: {
          id: { in: glAccountIds },
          businessUnitId: data.businessUnitId
        }
      })

      const accountMap = new Map(glAccounts.map(acc => [acc.id, acc]))

      // Validate all accounts exist
      for (const line of data.lines) {
        if (!accountMap.has(line.glAccountId)) {
          throw new Error(`GL Account ${line.glAccountId} not found`)
        }
      }

      // Create journal entry
      const journalEntry = await tx.journalEntry.create({
        data: {
          docNum,
          documentDate: data.documentDate,
          postingDate: data.postingDate,
          memo: data.memo,
          referenceNumber: data.referenceNumber,
          businessUnitId: data.businessUnitId,
          authorId: data.authorId,
          accountingPeriodId: openPeriod.id,
          approvalWorkflowStatus: 'DRAFT',
          isPosted: false
        }
      })

      // Create journal lines
      const journalLines = data.lines.map(line => {
        const account = accountMap.get(line.glAccountId)!
        return {
          journalEntryId: journalEntry.id,
          glAccountBusinessUnitId: data.businessUnitId,
          glAccountCode: account.accountCode,
          debit: line.debit ? new Prisma.Decimal(line.debit) : null,
          credit: line.credit ? new Prisma.Decimal(line.credit) : null,
          description: line.description,
          createdById: data.authorId
        }
      })

      await tx.journalEntryLine.createMany({
        data: journalLines
      })

      return journalEntry
    })
  }

  /**
   * Posts a journal entry (marks as posted and updates GL balances)
   * 
   * @param journalEntryId - The journal entry ID
   * @param postedById - The user posting the entry
   * @returns Promise<JournalEntry>
   */
  static async postJournalEntry(journalEntryId: string, postedById: string) {
    return await prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.findUnique({
        where: { id: journalEntryId },
        include: {
          lines: {
            include: {
              glAccount: true
            }
          }
        }
      })

      if (!journalEntry) {
        throw new Error('Journal entry not found')
      }

      if (journalEntry.isPosted) {
        throw new Error('Journal entry is already posted')
      }

      if (journalEntry.approvalWorkflowStatus !== 'APPROVED') {
        throw new Error('Journal entry must be approved before posting')
      }

      // Validate balance
      const totalDebits = journalEntry.lines.reduce((sum, line) => 
        sum + (line.debit ? Number(line.debit) : 0), 0)
      const totalCredits = journalEntry.lines.reduce((sum, line) => 
        sum + (line.credit ? Number(line.credit) : 0), 0)

      if (Math.abs(totalDebits - totalCredits) >= 0.01) {
        throw new Error('Journal entry is not balanced')
      }

      // Update journal entry
      const updatedJE = await tx.journalEntry.update({
        where: { id: journalEntryId },
        data: {
          isPosted: true,
          postedAt: new Date(),
          postedById,
          approvalWorkflowStatus: 'POSTED'
        }
      })

      // Update GL account balances
      for (const line of journalEntry.lines) {
        if (line.glAccount) {
          const debitAmount = line.debit ? Number(line.debit) : 0
          const creditAmount = line.credit ? Number(line.credit) : 0
          
          const balanceChange = line.glAccount.normalBalance === 'DEBIT' 
            ? debitAmount - creditAmount 
            : creditAmount - debitAmount

          await tx.glAccount.update({
            where: { id: line.glAccount.id },
            data: {
              balance: {
                increment: new Prisma.Decimal(balanceChange)
              }
            }
          })
        }
      }

      return updatedJE
    })
  }

  /**
   * Gets trial balance for a business unit
   * 
   * @param businessUnitId - The business unit ID
   * @param asOfDate - The date for the trial balance
   * @returns Promise<TrialBalanceData>
   */
  static async getTrialBalance(businessUnitId: string, asOfDate?: Date) {
    const balances = await this.getAccountBalances(businessUnitId, asOfDate)
    
    const totalDebits = balances
      .filter(acc => acc.balance > 0 && acc.normalBalance === 'DEBIT')
      .reduce((sum, acc) => sum + acc.balance, 0)
    
    const totalCredits = balances
      .filter(acc => acc.balance > 0 && acc.normalBalance === 'CREDIT')
      .reduce((sum, acc) => sum + acc.balance, 0)

    return {
      asOfDate: asOfDate || new Date(),
      accounts: balances.map(acc => ({
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        debitBalance: acc.normalBalance === 'DEBIT' && acc.balance > 0 ? acc.balance : 0,
        creditBalance: acc.normalBalance === 'CREDIT' && acc.balance > 0 ? acc.balance : 0
      })),
      totals: {
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
      }
    }
  }
}

// Type definitions
export interface AccountBalance {
  accountId: string
  accountCode: string
  accountName: string
  accountType: string
  normalBalance: string | null
  balance: number
  totalDebits: number
  totalCredits: number
  asOfDate: Date
}

export interface TrialBalanceData {
  asOfDate: Date
  accounts: {
    accountCode: string
    accountName: string
    accountType: string
    debitBalance: number
    creditBalance: number
  }[]
  totals: {
    totalDebits: number
    totalCredits: number
    isBalanced: boolean
  }
}