import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest, { params }: { params: { methodId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get('x-business-unit-id');
    const { methodId } = params;

    if (!businessUnitId || !methodId) {
      return new NextResponse("Business Unit ID and Method ID are required", {
        status: 400,
      })
    }

    // Verify user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }
    
    // Check if the payment method exists before attempting to delete
    const existingMethod = await prisma.paymentMethod.findUnique({
        where: { id: methodId }
    });

    if (!existingMethod) {
        return new NextResponse("Payment Method not found", { status: 404 });
    }

    // Delete the specified payment method
    await prisma.paymentMethod.delete({
      where: {
        id: methodId,
      },
    })

    return new NextResponse("Payment method deleted successfully", { status: 200 })
  } catch (error) {
    console.error("[PAYMENT_METHOD_DELETE]", error)
    // Handle potential errors, e.g., if the method is in use
    if (error instanceof Error && 'code' in error && (error).code === 'P2003') {
        return new NextResponse("Cannot delete: This payment method is in use.", { status: 409 });
    }
    return new NextResponse("Internal error", { status: 500 })
  }
}
