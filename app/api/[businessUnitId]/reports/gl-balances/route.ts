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

    // Calculate account balances
    const accountsWithBalances = accounts.map(account => {
        const totalDebits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
            sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0)
        const totalCredits = account.journalLines.reduce((sum: number, line: JournalEntryLine) => 
            sum + (line.credit ? parseFloat(line.credit.toString()) : 0), 0)

        const debitBalance = totalDebits > totalCredits ? totalDebits - totalCredits : 0
        const creditBalance = totalCredits > totalDebits ? totalCredits - totalDebits : 0
        const netBalance = account.normalBalance === 'DEBIT' ? debitBalance - creditBalance : creditBalance - debitBalance

        return {
            accountCode: account.accountCode,
            accountName: account.name,
            accountType: account.accountType.name,
            normalBalance: account.normalBalance,
            debitBalance,
            creditBalance,
            netBalance,
            isControlAccount: account.isControlAccount,
            category: account.accountCategory?.name
        }
    }).filter(account => 
        includeZeroBalances || account.netBalance !== 0
    )

    const summary = {
      totalDebits: accountsWithBalances.reduce((sum, acc) => sum + acc.debitBalance, 0),
      totalCredits: accountsWithBalances.reduce((sum, acc) => sum + acc.creditBalance, 0),
      accountCount: accountsWithBalances.length
    }

    const glBalancesData = {
      asOfDate: endDate,
      accounts: accountsWithBalances,
      summary
    }

    return NextResponse.json(glBalancesData)
  } catch (error) {
    console.error("[GL_BALANCES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
