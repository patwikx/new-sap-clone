import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

interface MenuItemGlMappingInput {
  menuItemId: string
  salesAccountId: string
  cogsAccountId?: string
  inventoryAccountId?: string
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

    const body: MenuItemGlMappingInput = await req.json()
    const { menuItemId, salesAccountId, cogsAccountId, inventoryAccountId } = body

    if (!menuItemId || !salesAccountId) {
      return new NextResponse("Menu item ID and sales account ID are required", { status: 400 })
    }

    // Verify menu item belongs to this business unit
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: menuItemId,
        businessUnitId
      }
    })

    if (!menuItem) {
      return new NextResponse("Menu item not found or does not belong to this business unit", { status: 404 })
    }

    // Upsert the mapping
    const mapping = await prisma.menuItemGlMapping.upsert({
      where: { menuItemId },
      update: {
        salesAccountId,
        cogsAccountId: cogsAccountId || null,
        inventoryAccountId: inventoryAccountId || null,
        updatedAt: new Date()
      },
      create: {
        menuItemId,
        salesAccountId,
        cogsAccountId: cogsAccountId || null,
        inventoryAccountId: inventoryAccountId || null
      },
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
    })

    return NextResponse.json(mapping, { status: 201 })
  } catch (error) {
    console.error("[MENU_ITEM_GL_MAPPINGS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}