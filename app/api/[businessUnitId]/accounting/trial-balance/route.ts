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

    // Get trial balance
    const trialBalance = await GlService.getTrialBalance(businessUnitId, asOfDate)

    return NextResponse.json(trialBalance)
  } catch (error) {
    console.error("[TRIAL_BALANCE_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}