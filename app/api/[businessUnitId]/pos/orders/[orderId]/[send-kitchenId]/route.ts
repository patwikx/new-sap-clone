import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { businessUnitId: string; orderId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, orderId } = params

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    const isAuthorized = session.user.role?.role === "Admin" || session.user.role?.role === "Cashier"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if order exists and can be sent to kitchen
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!existingOrder) {
      return new NextResponse("Order not found", { status: 404 })
    }

    // Check if order is in a status that can be sent to kitchen
    if (existingOrder.status !== "OPEN") {
      return new NextResponse("Order is not in open status", { status: 400 })
    }

    // Update order status to PREPARING (kitchen status)
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PREPARING", // Use valid OrderStatus enum value
        // Removed sentToKitchenAt since it doesn't exist in schema
      },
      include: {
        table: {
          select: {
            name: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("[POS_ORDER_SEND_KITCHEN]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
