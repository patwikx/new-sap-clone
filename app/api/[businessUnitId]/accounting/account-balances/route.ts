import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { GlService } from "@/lib/services/gl-service"

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

    // Check authorization
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const url = new URL(req.url)
    const asOfDateParam = url.searchParams.get("asOfDate")
    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : undefined

    // Get account balances
    const balances = await GlService.getAccountBalances(businessUnitId, asOfDate)

    return NextResponse.json({
      asOfDate: asOfDate || new Date(),
      accounts: balances,
      summary: {
        totalAccounts: balances.length,
        totalDebits: balances.reduce((sum, acc) => sum + acc.totalDebits, 0),
        totalCredits: balances.reduce((sum, acc) => sum + acc.totalCredits, 0)
      }
    })
  } catch (error) {
    console.error("[ACCOUNT_BALANCES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}