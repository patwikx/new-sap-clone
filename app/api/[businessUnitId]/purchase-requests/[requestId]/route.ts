import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id");
    const requestId = req.headers.get("x-request-id");

    if (!businessUnitId || !requestId) {
      return new NextResponse("Missing required headers", { status: 400 });
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      include: {
        requestor: {
          select: {
            name: true
          }
        },
        approver: {
          select: {
            name: true
          }
        },
        items: {
          include: {
            uom: {
              select: {
                symbol: true
              }
            }
          }
        }
      }
    })

    if (!purchaseRequest) {
      return new NextResponse("Purchase request not found", { status: 404 })
    }

    // Calculate total estimated amount
    const totalEstimatedAmount = purchaseRequest.items.reduce((sum, item) => {
      const qty = parseFloat(item.requestedQuantity.toString())
      // Note: estimatedPrice field doesn't exist in schema, using 0 for now
      const price = 0
      return sum + (qty * price)
    }, 0)

    return NextResponse.json({
      ...purchaseRequest,
      totalEstimatedAmount
    })
  } catch (error) {
    console.error("[PURCHASE_REQUEST_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id");
    const requestId = req.headers.get("x-request-id");

    if (!businessUnitId || !requestId) {
      return new NextResponse("Missing required headers", { status: 400 });
    }

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
