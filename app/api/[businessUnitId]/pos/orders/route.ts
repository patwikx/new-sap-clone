import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface OrderItemInput {
  menuItemId: string
  quantity: number
  priceAtSale: number
  notes?: string
}

interface OrderBodyInput {
  tableId: string
  customerName?: string
  items: OrderItemInput[]
  sendToKitchen?: boolean
}

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

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    const isAuthorized = session.user.role?.role === "Admin" || session.user.role?.role === "Cashier"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const orders = await prisma.order.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        table: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
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
                name: true,
              },
            },
            modifiers: {
              select: {
                id: true,
                name: true,
                priceChange: true, // Changed from 'price' to 'priceChange'
              },
            },
          },
        },
        payments: {
          include: {
            paymentMethod: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("[POS_ORDERS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

    // Get additional context from headers
    const headerTableId = req.headers.get("x-table-id")

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    const isAuthorized = session.user.role?.role === "Admin" || session.user.role?.role === "Cashier"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body: OrderBodyInput = await req.json()
    const { tableId, customerName, items, sendToKitchen } = body

    if (!tableId || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Validate table ID if provided in headers
    if (headerTableId && headerTableId !== tableId) {
      return new NextResponse("Table ID mismatch", { status: 400 })
    }

    // Check if table exists and is available
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    })

    if (!table) {
      return new NextResponse("Table not found", { status: 404 })
    }

    if (table.status !== "AVAILABLE") {
      return new NextResponse("Table is not available", { status: 400 })
    }

    // Validate that all menu items exist
    const menuItemIds = items.map((item) => item.menuItemId)
    const existingMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        businessUnitId: businessUnitId,
      },
      select: { id: true },
    })

    const existingMenuItemIds = existingMenuItems.map((item) => item.id)
    const invalidMenuItemIds = menuItemIds.filter((id) => !existingMenuItemIds.includes(id))

    if (invalidMenuItemIds.length > 0) {
      return new NextResponse(`Invalid menu item IDs: ${invalidMenuItemIds.join(", ")}`, { status: 400 })
    }

    // Get active terminal (you might want to get this from session or request)
    const terminal = await prisma.posTerminal.findFirst({
      where: { businessUnitId },
    })

    if (!terminal) {
      return new NextResponse("No POS terminal found", { status: 400 })
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.priceAtSale, 0)

    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          totalAmount: new Prisma.Decimal(totalAmount),
          status: sendToKitchen ? "PREPARING" : "OPEN", // Use valid OrderStatus values
          businessUnitId,
          tableId,
          userId: session.user.id!,
          terminalId: terminal.id,
          items: {
            create: items.map((item: OrderItemInput) => ({
              quantity: item.quantity, // Keep as Int, not Decimal
              priceAtSale: new Prisma.Decimal(item.priceAtSale), // Use priceAtSale instead of unitPrice
              notes: item.notes,
              menuItemId: item.menuItemId, // Direct field assignment instead of connect
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

      // Update table status (removed currentOrderId since it doesn't exist in schema)
      await tx.table.update({
        where: { id: tableId },
        data: {
          status: "OCCUPIED",
        },
      })

      return newOrder
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("[POS_ORDERS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
