import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { PosAccountingService } from "@/lib/services/pos-accounting-service"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ businessUnitId: string; orderId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, orderId } = await params

    // Validate headers
    const headerBusinessUnitId = req.headers.get("x-business-unit-id")
    const headerOrderId = req.headers.get("x-order-id")

    if (headerBusinessUnitId && headerBusinessUnitId !== businessUnitId) {
      return new NextResponse("Business unit ID mismatch", { status: 400 })
    }

    if (headerOrderId && headerOrderId !== orderId) {
      return new NextResponse("Order ID mismatch", { status: 400 })
    }

    // Check authorization
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    const isAuthorized = session.user.role?.role === "Admin" ||
                         session.user.role?.role === "Cashier" ||
                         session.user.role?.role === "Accountant"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Post order to GL
    const result = await PosAccountingService.postOrderToGl(orderId)

    // --- FIX STARTS HERE ---
    // Add a check to ensure the necessary documents were created.
    // If not, something went wrong in the service, and we should throw an error.
    if (!result.arInvoice || !result.journalEntry) {
      console.error("[POS_ORDER_POST_TO_GL] Failed to create accounting documents for order:", orderId);
      throw new Error("Failed to create AR Invoice or Journal Entry during posting.");
    }
    // --- FIX ENDS HERE ---

    // At this point, TypeScript knows `result.journalEntry` is not null.
    return NextResponse.json({
      success: true,
      message: "Order posted to General Ledger successfully",
      data: {
        arInvoiceId: result.arInvoice.id,
        arInvoiceNumber: result.arInvoice.docNum,
        journalEntryId: result.journalEntry.id,
        journalEntryNumber: result.journalEntry.docNum,
        totalDebits: result.totalDebits,
        totalCredits: result.totalCredits
      }
    })
  } catch (error) {
    console.error("[POS_ORDER_POST_TO_GL]", error)
    
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    
    return new NextResponse("Internal error", { status: 500 })
  }
}