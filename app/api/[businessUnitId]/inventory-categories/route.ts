import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { businessUnitId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // The businessUnitId is now available from the route parameters
    const { businessUnitId } = params

    if (!businessUnitId) {
      return new NextResponse("Business Unit ID is required", {
        status: 400,
      })
    }

    // Verify user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden: You do not have access to this business unit", { status: 403 })
    }

    // Fetch all inventory categories for the specified business unit
    const inventoryCategories = await prisma.inventoryCategory.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(inventoryCategories)
  } catch (error) {
    console.error("[INVENTORY_CATEGORIES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
