import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { PosAccountingService } from "@/lib/services/pos-accounting-service"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessUnitId: string; orderId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, orderId } = await params

    // Check authorization
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Get accounting summary
    const summary = await PosAccountingService.getOrderAccountingSummary(orderId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error("[POS_ORDER_ACCOUNTING_SUMMARY]", error)
    
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    
    return new NextResponse("Internal error", { status: 500 })
  }
}