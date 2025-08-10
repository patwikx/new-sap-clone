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

    // Get revenue and expense accounts with their balances
    const accounts = await prisma.glAccount.findMany({
      where: {
        businessUnitId: businessUnitId,
        accountType: {
          name: { in: ['REVENUE', 'EXPENSE'] }
        }
      },
      include: {
        accountType: true,
        // Corrected relation name from 'journalEntryLines' to 'journalLines'
        journalLines: {
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
      },
      orderBy: {
        accountCode: 'asc'
      }
    })

    // Calculate account balances for the period
    const accountsWithBalances = accounts.map(account => {
      const totalDebits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
        sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0)
      const totalCredits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
        sum + (line.credit ? parseFloat(line.credit.toString()) : 0), 0)
      
      // For P&L, revenue is credit balance, expenses are debit balance
      const balance = account.accountType.name === 'REVENUE' 
        ? totalCredits - totalDebits 
        : totalDebits - totalCredits

      return {
        accountCode: account.accountCode,
        name: account.name,
        accountType: account.accountType.name,
        amount: Math.abs(balance) // Use absolute value for display
      }
    })

    // Separate revenue and expenses
    const revenueAccounts = accountsWithBalances.filter(acc => acc.accountType === 'REVENUE')
    const expenseAccounts = accountsWithBalances.filter(acc => acc.accountType === 'EXPENSE')

    // Categorize expenses (simplified)
    const costOfSales = expenseAccounts.filter(acc => 
      acc.accountCode.startsWith('5') || acc.name.toLowerCase().includes('cost'))
    const operatingExpenses = expenseAccounts.filter(acc => 
      !costOfSales.some(c => c.accountCode === acc.accountCode))

    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.amount, 0)
    const totalCostOfSales = costOfSales.reduce((sum, acc) => sum + acc.amount, 0)
    const totalOperatingExpenses = operatingExpenses.reduce((sum, acc) => sum + acc.amount, 0)
    const totalExpenses = totalCostOfSales + totalOperatingExpenses

    const grossProfit = totalRevenue - totalCostOfSales
    const operatingProfit = grossProfit - totalOperatingExpenses
    const netProfit = operatingProfit // Simplified - no other income/expenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    const profitLossData = {
      period: `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
      revenue: {
        accounts: revenueAccounts,
        totalRevenue
      },
      expenses: {
        costOfSales,
        operatingExpenses,
        totalExpenses
      },
      grossProfit,
      operatingProfit,
      netProfit,
      profitMargin
    }

    return NextResponse.json(profitLossData)
  } catch (error) {
    console.error("[PROFIT_LOSS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
