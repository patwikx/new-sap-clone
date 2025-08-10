import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; requestId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, requestId } = params

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if request exists and can be deleted
    const existingRequest = await prisma.purchaseRequest.findUnique({
      where: { id: requestId }
    })

    if (!existingRequest) {
      return new NextResponse("Purchase request not found", { status: 404 })
    }

    if (existingRequest.status !== 'PENDING') {
      return new NextResponse("Cannot delete non-pending purchase request", { status: 400 })
    }

    await prisma.purchaseRequest.delete({
      where: { id: requestId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[PURCHASE_REQUEST_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}