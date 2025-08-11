import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

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

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId && assignment.role.role === "Admin",
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Get tables with their current active orders
    const tables = await prisma.table.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        orders: {
          where: {
            status: {
              in: ["OPEN", "PREPARING"], // Active order statuses
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get only the most recent active order
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            businessPartner: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    // Transform the data to match your expected structure
    const transformedTables = tables.map((table) => ({
      ...table,
      currentOrder:
        table.orders.length > 0
          ? {
              orderNumber: table.orders[0].id, // Using ID as order number
              customerName: table.orders[0].businessPartner?.name || "Walk-in",
              totalAmount: table.orders[0].totalAmount,
            }
          : null,
      orders: undefined, // Remove the orders array from response
    }))

    return NextResponse.json(transformedTables)
  } catch (error) {
    console.error("[POS_TABLES_MANAGEMENT_GET]", error)
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
        createdById: session.user.id, // This should now work with your updated schema
      },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    console.error("[POS_TABLES_MANAGEMENT_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
