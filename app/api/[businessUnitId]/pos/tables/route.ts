import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

// Define proper types for the response
type OrderItemWithDetails = {
  id: string
  quantity: number
  priceAtSale: Prisma.Decimal
  menuItem: {
    name: string
  }
  modifiers: {
    id: string
    name: string
    priceChange: Prisma.Decimal
  }[]
}

type OrderWithDetails = {
  id: string
  status: string
  totalAmount: Prisma.Decimal
  createdAt: Date
  items: OrderItemWithDetails[]
}

type TableWithOrder = {
  id: string
  name: string
  capacity: string | null
  location: string | null
  status: string
  businessUnitId: string
  createdAt: Date
  createdById: string | null
  orders: OrderWithDetails[]
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

    // Check if user has access to this business unit and is authorized for POS
    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    const isAuthorized = session.user.role?.role === "Admin" || session.user.role?.role === "Cashier"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Get tables with their current orders (if any)
    const tables = await prisma.table.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        orders: {
          where: {
            status: {
              in: ["OPEN", "PREPARING"], // Use explicit status values instead of "not PAID"
            },
          },
          include: {
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
                    priceChange: true,
                  },
                },
              },
            },
            businessPartner: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get only the most recent active order
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    // Transform the data to include calculated totals with proper typing
    const tablesWithTotals = tables.map((table) => {
      const currentOrder = table.orders[0] || null

      return {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
        businessUnitId: table.businessUnitId,
        createdAt: table.createdAt,
        createdById: table.createdById,
        currentOrder: currentOrder
          ? {
              id: currentOrder.id,
              status: currentOrder.status,
              totalAmount: currentOrder.totalAmount,
              createdAt: currentOrder.createdAt,
              customerName: currentOrder.businessPartner?.name || "Walk-in",
              items: currentOrder.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                priceAtSale: item.priceAtSale,
                menuItemName: item.menuItem.name,
                modifiers: item.modifiers.map((modifier) => ({
                  id: modifier.id,
                  name: modifier.name,
                  priceChange: modifier.priceChange,
                })),
                // Calculate line total for this item
                lineTotal: Number(item.priceAtSale) * item.quantity,
              })),
              // Calculate total from items
              calculatedTotal: currentOrder.items.reduce(
                (sum, item) => sum + Number(item.priceAtSale) * item.quantity,
                0,
              ),
              // Calculate modifiers total
              modifiersTotal: currentOrder.items.reduce(
                (sum, item) =>
                  sum +
                  item.modifiers.reduce((modSum, modifier) => modSum + Number(modifier.priceChange) * item.quantity, 0),
                0,
              ),
            }
          : null,
      }
    })

    return NextResponse.json(tablesWithTotals)
  } catch (error) {
    console.error("[POS_TABLES_GET]", error)
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

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId && assignment.role.role === "Admin",
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { name, capacity, location, status } = body

    if (!name) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Validate capacity if provided (it's a string in your schema)
    if (capacity && typeof capacity !== "string") {
      return new NextResponse("Capacity must be a string", { status: 400 })
    }

    // Validate status if provided
    const validStatuses = ["AVAILABLE", "OCCUPIED", "RESERVED"]
    if (status && !validStatuses.includes(status)) {
      return new NextResponse("Invalid status", { status: 400 })
    }

    // Check if table name already exists in this business unit
    const existingTable = await prisma.table.findFirst({
      where: {
        name,
        businessUnitId,
      },
    })

    if (existingTable) {
      return new NextResponse("Table name already exists", { status: 409 })
    }

    const table = await prisma.table.create({
      data: {
        name,
        capacity: capacity || null,
        location: location || null,
        status: status || "AVAILABLE",
        businessUnitId,
        createdById: session.user.id,
      },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    console.error("[POS_TABLES_MANAGEMENT_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
