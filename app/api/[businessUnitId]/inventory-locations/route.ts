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
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(inventoryLocations)
  } catch (error) {
    console.error("[INVENTORY_LOCATIONS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}