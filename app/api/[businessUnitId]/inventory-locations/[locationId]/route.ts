import { NextRequest, NextResponse } from "next/server"
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

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const inventoryLocations = await prisma.inventoryLocation.findMany({
      where: {
        businessUnitId: businessUnitId
      },
      include: {
        // Corrected relation name from 'stocks' to 'stockLevels'
        stockLevels: {
          include: {
            inventoryItem: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Map the result to match the client-side interface (stockLevels -> stocks)
    const locationsWithStocks = inventoryLocations.map(location => {
        const { stockLevels, ...rest } = location;
        return {
            ...rest,
            stocks: stockLevels
        }
    })

    return NextResponse.json(locationsWithStocks)
  } catch (error) {
    console.error("[INVENTORY_LOCATIONS_GET]", error)
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
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { name, description, address, contactPerson, phone } = body

    if (!name) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if name already exists in this business unit
    const existingLocation = await prisma.inventoryLocation.findFirst({
      where: {
        name,
        businessUnitId
      }
    })

    if (existingLocation) {
      return new NextResponse("Location name already exists", { status: 409 })
    }

    const inventoryLocation = await prisma.inventoryLocation.create({
      data: {
        name,
        description,
        address,
        contactPerson,
        phone,
        businessUnitId
      },
      include: {
        // Corrected relation name from 'stocks' to 'stockLevels'
        stockLevels: {
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

    return NextResponse.json(inventoryLocation, { status: 201 })
  } catch (error) {
    console.error("[INVENTORY_LOCATIONS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; locationId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, locationId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { name, description, address, contactPerson, phone } = body

    if (!name) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if name is taken by another location
    const existingLocation = await prisma.inventoryLocation.findFirst({
      where: {
        name,
        businessUnitId,
        NOT: { id: locationId }
      }
    })

    if (existingLocation) {
      return new NextResponse("Location name already exists", { status: 409 })
    }

    const inventoryLocation = await prisma.inventoryLocation.update({
      where: { id: locationId },
      data: {
        name,
        description,
        address,
        contactPerson,
        phone
      },
      include: {
        stockLevels: { // Corrected from 'stocks' to 'stockLevels'
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

    return NextResponse.json(inventoryLocation)
  } catch (error) {
    console.error("[INVENTORY_LOCATION_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; locationId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, locationId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if location has any stock records
    const stockRecords = await prisma.inventoryStock.findFirst({
      where: { locationId }
    })

    if (stockRecords) {
      return new NextResponse("Cannot delete location with existing stock records", { status: 400 })
    }

    await prisma.inventoryLocation.delete({
      where: { id: locationId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[INVENTORY_LOCATION_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
