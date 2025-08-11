import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; itemId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, itemId } = params

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
    const { name, description, price, categoryId, isActive } = body

    if (!name || !price || !categoryId) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if menu item name is taken by another item
    const existingItem = await prisma.menuItem.findFirst({
      where: {
        name,
        businessUnitId,
        NOT: { id: itemId }
      }
    })

    if (existingItem) {
      return new NextResponse("Menu item name already exists", { status: 409 })
    }

    const menuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        name,
        description,
        price: new Prisma.Decimal(price),
        categoryId,
        isActive
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(menuItem)
  } catch (error) {
    console.error("[MENU_ITEM_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; itemId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, itemId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if menu item is being used in any orders
    const orderItems = await prisma.orderItem.findFirst({
      where: { menuItemId: itemId }
    })

    if (orderItems) {
      return new NextResponse("Cannot delete menu item that has been ordered", { status: 400 })
    }

    await prisma.menuItem.delete({
      where: { id: itemId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[MENU_ITEM_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}