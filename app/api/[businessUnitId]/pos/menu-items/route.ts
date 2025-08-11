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

    // Check if user has access to this business unit and is authorized for POS
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    const isAuthorized = session.user.role?.role === 'Admin' || session.user.role?.role === 'Cashier'

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        businessUnitId: businessUnitId,
        isActive: true
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(menuItems)
  } catch (error) {
    console.error("[POS_MENU_ITEMS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}