import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

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
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        businessUnitId: businessUnitId
      },
      include: {
        category: {
          select: {
            id: true,
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
    console.error("[MENU_ITEMS_MANAGEMENT_GET]", error)
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
    const { name, description, price, categoryId, isActive } = body

    if (!name || !price || !categoryId) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if menu item name already exists in this business unit
    const existingItem = await prisma.menuItem.findFirst({
      where: {
        name,
        businessUnitId
      }
    })

    if (existingItem) {
      return new NextResponse("Menu item name already exists", { status: 409 })
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: new Prisma.Decimal(price),
        categoryId,
        isActive: isActive ?? true,
        businessUnitId,
        createdById: session.user.id
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

    return NextResponse.json(menuItem, { status: 201 })
  } catch (error) {
    console.error("[MENU_ITEMS_MANAGEMENT_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}