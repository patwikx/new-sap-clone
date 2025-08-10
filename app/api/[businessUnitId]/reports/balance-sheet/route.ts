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
    const endDate = url.searchParams.get("endDate") || new Date().toISOString().split('T')[0]

    // Get all GL accounts with their balances
    const accounts = await prisma.glAccount.findMany({
      where: {
        businessUnitId: businessUnitId
      },
      include: {
        accountType: true,
        accountCategory: true,
        // Corrected relation name from 'journalEntryLines' to 'journalLines'
        journalLines: {
          where: {
            journalEntry: {
              postingDate: { lte: new Date(endDate) },
              isPosted: true
            }
          }
        }
      },
      orderBy: {
        accountCode: 'asc'
      }
    })

    // Calculate account balances
    const accountsWithBalances = accounts.map(account => {
      const totalDebits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
        sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0)
      const totalCredits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
        sum + (line.credit ? parseFloat(line.credit.toString()) : 0), 0)
      
      const balance = account.normalBalance === 'DEBIT' 
        ? totalDebits - totalCredits 
        : totalCredits - totalDebits

      return {
        accountCode: account.accountCode,
        name: account.name,
        accountType: account.accountType.name,
        category: account.accountCategory?.name,
        balance: balance
      }
    })

    // Group accounts by type
    const assets = accountsWithBalances.filter(acc => acc.accountType === 'ASSET')
    const liabilities = accountsWithBalances.filter(acc => acc.accountType === 'LIABILITY')
    const equity = accountsWithBalances.filter(acc => acc.accountType === 'EQUITY')

    // Separate current vs non-current (simplified logic)
    const currentAssets = assets.filter(acc => 
      acc.accountCode.startsWith('1') && parseInt(acc.accountCode) < 1500)
    const nonCurrentAssets = assets.filter(acc => 
      !currentAssets.some(ca => ca.accountCode === acc.accountCode))

    const currentLiabilities = liabilities.filter(acc => 
      acc.accountCode.startsWith('2') && parseInt(acc.accountCode) < 2500)
    const nonCurrentLiabilities = liabilities.filter(acc => 
      !currentLiabilities.some(cl => cl.accountCode === acc.accountCode))

    const balanceSheetData = {
      asOfDate: endDate,
      assets: {
        currentAssets: [{
          name: "Current Assets",
          accounts: currentAssets,
          total: currentAssets.reduce((sum, acc) => sum + acc.balance, 0)
        }],
        nonCurrentAssets: nonCurrentAssets.length > 0 ? [{
          name: "Non-Current Assets",
          accounts: nonCurrentAssets,
          total: nonCurrentAssets.reduce((sum, acc) => sum + acc.balance, 0)
        }] : [],
        totalAssets: assets.reduce((sum, acc) => sum + acc.balance, 0)
      },
      liabilities: {
        currentLiabilities: [{
          name: "Current Liabilities",
          accounts: currentLiabilities,
          total: currentLiabilities.reduce((sum, acc) => sum + acc.balance, 0)
        }],
        nonCurrentLiabilities: nonCurrentLiabilities.length > 0 ? [{
          name: "Non-Current Liabilities",
          accounts: nonCurrentLiabilities,
          total: nonCurrentLiabilities.reduce((sum, acc) => sum + acc.balance, 0)
        }] : [],
        totalLiabilities: liabilities.reduce((sum, acc) => sum + acc.balance, 0)
      },
      equity: {
        accounts: [{
          name: "Equity",
          accounts: equity,
          total: equity.reduce((sum, acc) => sum + acc.balance, 0)
        }],
        totalEquity: equity.reduce((sum, acc) => sum + acc.balance, 0)
      }
    }

    return NextResponse.json(balanceSheetData)
  } catch (error) {
    console.error("[BALANCE_SHEET_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
