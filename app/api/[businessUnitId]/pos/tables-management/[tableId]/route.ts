import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { businessUnitId: string; tableId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, tableId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId && assignment.role.role === "Admin",
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Verify the table belongs to the business unit
    const existingTable = await prisma.table.findFirst({
      where: {
        id: tableId,
        businessUnitId,
      },
    })

    if (!existingTable) {
      return new NextResponse("Table not found", { status: 404 })
    }

    const body = await req.json()
    const { name, capacity, location, status } = body

    if (!name || !status) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Validate status is a valid TableStatus
    const validStatuses = ["AVAILABLE", "OCCUPIED", "RESERVED"]
    if (!validStatuses.includes(status)) {
      return new NextResponse("Invalid status", { status: 400 })
    }

    // Check if table name is taken by another table
    const duplicateTable = await prisma.table.findFirst({
      where: {
        name,
        businessUnitId,
        NOT: { id: tableId },
      },
    })

    if (duplicateTable) {
      return new NextResponse("Table name already exists", { status: 409 })
    }

    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        name,
        capacity: capacity || null,
        location: location || null,
        status,
      },
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error("[POS_TABLE_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { businessUnitId: string; tableId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, tableId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId && assignment.role.role === "Admin",
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if table exists and belongs to the business unit
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        businessUnitId,
      },
      include: {
        orders: {
          where: {
            status: {
              in: ["OPEN", "PREPARING"], // Active order statuses
            },
          },
        },
        reservations: {
          where: {
            reservationTime: {
              gte: new Date(), // Future reservations
            },
          },
        },
      },
    })

    if (!table) {
      return new NextResponse("Table not found", { status: 404 })
    }

    // Check if table has active orders
    if (table.orders.length > 0) {
      return new NextResponse("Cannot delete table with active orders", { status: 400 })
    }

    // Check if table has future reservations
    if (table.reservations.length > 0) {
      return new NextResponse("Cannot delete table with future reservations", { status: 400 })
    }

    await prisma.table.delete({
      where: { id: tableId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[POS_TABLE_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { businessUnitId: string; tableId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, tableId } = params

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        businessUnitId,
      },
      include: {
        orders: {
          where: {
            status: {
              in: ["OPEN", "PREPARING"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
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
        reservations: {
          where: {
            reservationTime: {
              gte: new Date(),
            },
          },
          orderBy: {
            reservationTime: "asc",
          },
          take: 1,
          include: {
            businessPartner: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!table) {
      return new NextResponse("Table not found", { status: 404 })
    }

    // Transform the response
    const response = {
      ...table,
      currentOrder:
        table.orders.length > 0
          ? {
              orderNumber: table.orders[0].id,
              customerName: table.orders[0].businessPartner?.name || "Walk-in",
              totalAmount: table.orders[0].totalAmount,
            }
          : null,
      nextReservation:
        table.reservations.length > 0
          ? {
              customerName: table.reservations[0].businessPartner.name,
              reservationTime: table.reservations[0].reservationTime,
              partySize: table.reservations[0].partySize,
            }
          : null,
      orders: undefined,
      reservations: undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[POS_TABLE_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
