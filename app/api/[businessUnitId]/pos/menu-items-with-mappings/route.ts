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

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
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
        },
        glMapping: {
          include: {
            salesAccount: {
              select: {
                accountCode: true,
                name: true
              }
            },
            cogsAccount: {
              select: {
                accountCode: true,
                name: true
              }
            },
            inventoryAccount: {
              select: {
                accountCode: true,
                name: true
              }
            }
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
    console.error("[MENU_ITEMS_WITH_MAPPINGS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}