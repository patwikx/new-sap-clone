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
    const includeZeroBalances = url.searchParams.get("includeZeroBalances") === "true"

    // Get all GL accounts with their journal entry lines
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

    // Calculate trial balance
    const trialBalanceAccounts = accounts.map(account => {
      const totalDebits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
        sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0)
      const totalCredits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
        sum + (line.credit ? parseFloat(line.credit.toString()) : 0), 0)

      // For trial balance, show actual debit/credit balances
      let debitBalance = 0;
      let creditBalance = 0;

      if (account.normalBalance === 'DEBIT') {
          const balance = totalDebits - totalCredits;
          if (balance > 0) debitBalance = balance;
          else creditBalance = -balance;
      } else { // CREDIT
          const balance = totalCredits - totalDebits;
          if (balance > 0) creditBalance = balance;
          else debitBalance = -balance;
      }

      return {
        accountCode: account.accountCode,
        accountName: account.name,
        accountType: account.accountType.name,
        normalBalance: account.normalBalance,
        debitBalance,
        creditBalance
      }
    }).filter(account => 
      includeZeroBalances || account.debitBalance > 0 || account.creditBalance > 0
    )

    const totalDebits = trialBalanceAccounts.reduce((sum, acc) => sum + acc.debitBalance, 0)
    const totalCredits = trialBalanceAccounts.reduce((sum, acc) => sum + acc.creditBalance, 0)
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

    const trialBalanceData = {
      asOfDate: endDate,
      accounts: trialBalanceAccounts,
      totals: {
        totalDebits,
        totalCredits,
        isBalanced
      }
    }

    return NextResponse.json(trialBalanceData)
  } catch (error) {
    console.error("[TRIAL_BALANCE_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
