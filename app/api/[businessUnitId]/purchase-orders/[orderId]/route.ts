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
    const orderId = req.headers.get("x-order-id");

    if (!businessUnitId || !orderId) {
      return new NextResponse("Missing required headers", { status: 400 });
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        businessPartner: {
          select: {
            name: true,
            phone: true,
            email: true,
            contactPerson: true
          }
        },
        owner: {
          select: {
            name: true
          }
        },
        purchaseRequest: {
          select: {
            prNumber: true
          }
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                name: true
              }
            },
            glAccount: {
              select: {
                accountCode: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!purchaseOrder) {
      return new NextResponse("Purchase order not found", { status: 404 })
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("[PURCHASE_ORDER_GET]", error)
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
    const orderId = req.headers.get("x-order-id");

    if (!businessUnitId || !orderId) {
      return new NextResponse("Missing required headers", { status: 400 });
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if order exists and can be deleted
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        receivings: true
      }
    })

    if (!existingOrder) {
      return new NextResponse("Purchase order not found", { status: 404 })
    }

    if (existingOrder.status === 'CLOSED') {
      return new NextResponse("Cannot delete closed purchase order", { status: 400 })
    }

    if (existingOrder.receivings.length > 0) {
      return new NextResponse("Cannot delete purchase order with goods receipts", { status: 400 })
    }

    await prisma.purchaseOrder.delete({
      where: { id: orderId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[PURCHASE_ORDER_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
