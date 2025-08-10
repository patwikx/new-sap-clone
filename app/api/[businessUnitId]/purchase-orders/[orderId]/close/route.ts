import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest
  // We no longer need params because we get both IDs from headers
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get both IDs from the headers to avoid the params error
    const businessUnitId = req.headers.get("x-business-unit-id")
    const orderId = req.headers.get("x-order-id")

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

    // Check if order exists and can be closed
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id: orderId }
    })

    if (!existingOrder) {
      return new NextResponse("Purchase order not found", { status: 404 })
    }

    if (existingOrder.status !== 'OPEN') {
      return new NextResponse("Purchase order is not open", { status: 400 })
    }

    // Close the order
    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: 'CLOSED'
      },
      include: {
        businessPartner: {
          select: {
            name: true
          }
        },
        owner: {
          select: {
            name: true
          }
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("[PURCHASE_ORDER_CLOSE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
