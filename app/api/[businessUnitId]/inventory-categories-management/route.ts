import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get('x-business-unit-id');

    if (!businessUnitId) {
      return new NextResponse("x-business-unit-id header is required", {
        status: 400,
      })
    }

    // Verify user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Fetch all inventory categories for the specified business unit
    const categories = await prisma.inventoryCategory.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        _count: {
          select: { inventoryItems: true },
        },
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Map the result to include the itemCount
    const response = categories.map(category => ({
        id: category.id,
        name: category.name,
        itemCount: category._count.inventoryItems,
    }));


    return NextResponse.json(response)
  } catch (error) {
    console.error("[INVENTORY_CATEGORIES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
