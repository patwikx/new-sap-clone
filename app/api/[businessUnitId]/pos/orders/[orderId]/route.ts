import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface OrderItemInput {
  menuItemId: string
  quantity: number
  priceAtSale: number // Changed from unitPrice to priceAtSale
  notes?: string
}

interface OrderUpdateInput {
  customerName?: string
  items: OrderItemInput[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessUnitId: string; orderId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, orderId } = await params

    // Get headers for additional context
    const headerBusinessUnitId = req.headers.get("x-business-unit-id")
    const headerOrderId = req.headers.get("x-order-id")

    // Validate headers match params (only if headers are provided)
    if (headerBusinessUnitId && headerBusinessUnitId !== businessUnitId) {
      console.error("[POS_ORDER_GET] Business unit ID mismatch:", { headerBusinessUnitId, businessUnitId })
      return new NextResponse("Business unit ID mismatch", { status: 400 })
    }

    if (headerOrderId && headerOrderId !== orderId) {
      console.error("[POS_ORDER_GET] Order ID mismatch:", { headerOrderId, orderId })
      return new NextResponse("Order ID mismatch", { status: 400 })
    }

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    const isAuthorized = session.user.role?.role === "Admin" || session.user.role?.role === "Cashier"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Get the order with all related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        businessPartner: {
          select: {
            name: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
              },
            },
            modifiers: {
              select: {
                id: true,
                name: true,
                priceChange: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    // Transform the response to match the expected format
    const response = {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      tableId: order.tableId,
      customerName: order.businessPartner?.name || "Walk-in",
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        priceAtSale: Number(item.priceAtSale),
        lineTotal: Number(item.priceAtSale) * item.quantity,
        menuItemName: item.menuItem.name,
        modifiers: item.modifiers.map((modifier) => ({
          id: modifier.id,
          name: modifier.name,
          priceChange: Number(modifier.priceChange),
        })),
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[POS_ORDER_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ businessUnitId: string; orderId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, orderId } = await params

    // Get headers for additional context
    const headerBusinessUnitId = req.headers.get("x-business-unit-id")
    const headerOrderId = req.headers.get("x-order-id")
    const headerTableId = req.headers.get("x-table-id")

    console.log("[POS_ORDER_PATCH] Headers:", {
      headerBusinessUnitId,
      headerOrderId,
      headerTableId,
      businessUnitId,
      orderId,
    })

    // Validate headers match params (only if headers are provided)
    if (headerBusinessUnitId && headerBusinessUnitId !== businessUnitId) {
      console.error("[POS_ORDER_PATCH] Business unit ID mismatch:", { headerBusinessUnitId, businessUnitId })
      return new NextResponse("Business unit ID mismatch", { status: 400 })
    }

    if (headerOrderId && headerOrderId !== orderId) {
      console.error("[POS_ORDER_PATCH] Order ID mismatch:", { headerOrderId, orderId })
      return new NextResponse("Order ID mismatch", { status: 400 })
    }

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    const isAuthorized = session.user.role?.role === "Admin" || session.user.role?.role === "Cashier"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body: OrderUpdateInput = await req.json()
    const { customerName, items } = body

    console.log("[POS_ORDER_PATCH] Request body:", { customerName, itemsCount: items?.length })

    if (!items || items.length === 0) {
      console.error("[POS_ORDER_PATCH] Missing required fields - no items")
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if order exists and can be modified
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!existingOrder) {
      console.error("[POS_ORDER_PATCH] Order not found:", orderId)
      return new NextResponse("Order not found", { status: 404 })
    }

    console.log("[POS_ORDER_PATCH] Existing order:", {
      id: existingOrder.id,
      status: existingOrder.status,
      tableId: existingOrder.tableId,
    })

    if (existingOrder.status === "PAID" || existingOrder.status === "CANCELLED") {
      console.error("[POS_ORDER_PATCH] Cannot modify completed order:", existingOrder.status)
      return new NextResponse("Cannot modify completed order", { status: 400 })
    }

    // Validate table ID if provided in headers - but be more lenient
    if (headerTableId && existingOrder.tableId && existingOrder.tableId !== headerTableId) {
      console.error("[POS_ORDER_PATCH] Table ID mismatch:", {
        headerTableId,
        existingOrderTableId: existingOrder.tableId,
      })
      return new NextResponse("Table ID mismatch", { status: 400 })
    }

    // Validate that all menu items exist
    const menuItemIds = items.map((item) => item.menuItemId)
    console.log("[POS_ORDER_PATCH] Menu item IDs to validate:", menuItemIds)

    const existingMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        businessUnitId: businessUnitId,
      },
      select: { id: true },
    })

    const existingMenuItemIds = existingMenuItems.map((item) => item.id)
    const invalidMenuItemIds = menuItemIds.filter((id) => !existingMenuItemIds.includes(id))

    console.log("[POS_ORDER_PATCH] Menu item validation:", {
      requested: menuItemIds.length,
      found: existingMenuItemIds.length,
      invalid: invalidMenuItemIds,
    })

    if (invalidMenuItemIds.length > 0) {
      console.error("[POS_ORDER_PATCH] Invalid menu item IDs:", invalidMenuItemIds)
      return new NextResponse(`Invalid menu item IDs: ${invalidMenuItemIds.join(", ")}`, { status: 400 })
    }

    // Calculate new total
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.priceAtSale, 0)
    console.log("[POS_ORDER_PATCH] Calculated total amount:", totalAmount)

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Delete existing order items
      await tx.orderItem.deleteMany({
        where: { orderId },
      })

      // Update order with new items
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: new Prisma.Decimal(totalAmount),
          items: {
            create: items.map((item: OrderItemInput) => ({
              quantity: item.quantity, // Keep as Int, not Decimal
              priceAtSale: new Prisma.Decimal(item.priceAtSale), // Use priceAtSale
              notes: item.notes,
              menuItemId: item.menuItemId, // Direct field assignment
            })),
          },
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

      return order
    })

    console.log("[POS_ORDER_PATCH] Order updated successfully:", updatedOrder.id)
    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("[POS_ORDER_PATCH] Error:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ businessUnitId: string; orderId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, orderId } = await params

    // Get headers for additional context
    const headerBusinessUnitId = req.headers.get("x-business-unit-id")
    const headerOrderId = req.headers.get("x-order-id")

    // Validate headers match params (only if headers are provided)
    if (headerBusinessUnitId && headerBusinessUnitId !== businessUnitId) {
      return new NextResponse("Business unit ID mismatch", { status: 400 })
    }

    if (headerOrderId && headerOrderId !== orderId) {
      return new NextResponse("Order ID mismatch", { status: 400 })
    }

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    const isAuthorized = session.user.role?.role === "Admin" || session.user.role?.role === "Cashier"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if order exists and can be cancelled
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    })

    if (!existingOrder) {
      return new NextResponse("Order not found", { status: 404 })
    }

    if (existingOrder.status === "PAID") {
      return new NextResponse("Cannot cancel paid order", { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Cancel the order
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      })

      // Free up the table (removed currentOrderId since it doesn't exist in schema)
      if (existingOrder.tableId) {
        await tx.table.update({
          where: { id: existingOrder.tableId },
          data: {
            status: "AVAILABLE",
          },
        })
      }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[POS_ORDER_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
