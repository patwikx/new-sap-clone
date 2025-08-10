import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { JournalEntryLine } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id")

    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      })
    }

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const url = new URL(req.url)
    const startDate = url.searchParams.get("startDate") || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const endDate = url.searchParams.get("endDate") || new Date().toISOString().split('T')[0]

    // Get cash accounts to calculate beginning and ending balances
    const cashAccounts = await prisma.glAccount.findMany({
      where: {
        businessUnitId: businessUnitId,
        OR: [
          { name: { contains: "Cash", mode: 'insensitive' } },
          { name: { contains: "Bank", mode: 'insensitive' } },
          { accountCode: { startsWith: "1000" } },
          { accountCode: { startsWith: "1010" } }
        ]
      },
      include: {
        journalLines: { // Corrected relation name
          where: {
            journalEntry: {
              isPosted: true
            }
          },
          include: { // Include the journal entry to access its posting date
            journalEntry: {
              select: {
                postingDate: true
              }
            }
          }
        }
      }
    })

    // Calculate cash balances
    const calculateCashBalance = (date: Date) => {
      return cashAccounts.reduce((total, account) => {
        const relevantLines = account.journalLines.filter(line => 
          line.journalEntry && new Date(line.journalEntry.postingDate) <= date
        )
        const debits = relevantLines.reduce((sum: number, line: JournalEntryLine) => 
          sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0)
        const credits = relevantLines.reduce((sum: number, line: JournalEntryLine) => 
          sum + (line.credit ? parseFloat(line.credit.toString()) : 0), 0)
        
        return total + (debits - credits) // Cash accounts have debit normal balance
      }, 0)
    }

    const beginningCash = calculateCashBalance(new Date(startDate))
    const endingCash = calculateCashBalance(new Date(endDate))

    // Get net income from P&L for the period
    const revenueExpenseAccounts = await prisma.glAccount.findMany({
      where: {
        businessUnitId: businessUnitId,
        accountType: {
          name: { in: ['REVENUE', 'EXPENSE'] }
        }
      },
      include: {
        accountType: true,
        journalLines: { // Corrected relation name
          where: {
            journalEntry: {
              postingDate: { 
                gte: new Date(startDate),
                lte: new Date(endDate)
              },
              isPosted: true
            }
          }
        }
      }
    })

    const netIncome = revenueExpenseAccounts.reduce((total, account) => {
      const debits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
        sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0)
      const credits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
        sum + (line.credit ? parseFloat(line.credit.toString()) : 0), 0)
      
      if (account.accountType.name === 'REVENUE') {
        return total + (credits - debits)
      } else {
        return total - (debits - credits)
      }
    }, 0)

    // Simplified cash flow statement
    const cashFlowData = {
      period: `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
      operatingActivities: {
        netIncome,
        adjustments: [
          { description: "Depreciation", amount: 0, isInflow: true },
          { description: "Bad Debt Expense", amount: 0, isInflow: true }
        ],
        workingCapitalChanges: [
          { description: "Increase in Accounts Receivable", amount: 0, isInflow: false },
          { description: "Increase in Inventory", amount: 0, isInflow: false },
          { description: "Increase in Accounts Payable", amount: 0, isInflow: true }
        ],
        netCashFromOperating: netIncome // Simplified
      },
      investingActivities: {
        items: [
          { description: "Purchase of Equipment", amount: 0, isInflow: false },
          { description: "Sale of Assets", amount: 0, isInflow: true }
        ],
        netCashFromInvesting: 0
      },
      financingActivities: {
        items: [
          { description: "Loan Proceeds", amount: 0, isInflow: true },
          { description: "Loan Payments", amount: 0, isInflow: false },
          { description: "Owner Withdrawals", amount: 0, isInflow: false }
        ],
        netCashFromFinancing: 0
      },
      netCashFlow: endingCash - beginningCash,
      beginningCash,
      endingCash
    }

    return NextResponse.json(cashFlowData)
  } catch (error) {
    console.error("[CASH_FLOW_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
