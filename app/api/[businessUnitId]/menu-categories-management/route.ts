import { type NextRequest, NextResponse } from "next/server"
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

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId && assignment.role.role === "Admin",
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const menuCategories = await prisma.menuCategory.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        _count: {
          select: {
            menuItems: true, // Changed from 'items' to 'menuItems'
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    })

    // Transform to include item count
    const categoriesWithCount = menuCategories.map((category) => ({
      ...category,
      itemCount: category._count.menuItems, // Changed from 'items' to 'menuItems'
    }))

    return NextResponse.json(categoriesWithCount)
  } catch (error) {
    console.error("[MENU_CATEGORIES_MANAGEMENT_GET]", error)
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
      (assignment) => assignment.businessUnitId === businessUnitId && assignment.role.role === "Admin",
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { name, description, sortOrder } = body

    if (!name) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if category name already exists in this business unit
    const existingCategory = await prisma.menuCategory.findFirst({
      where: {
        name,
        businessUnitId,
      },
    })

    if (existingCategory) {
      return new NextResponse("Menu category name already exists", { status: 409 })
    }

    const menuCategory = await prisma.menuCategory.create({
      data: {
        name,
        description,
        sortOrder: sortOrder || 1,
        businessUnitId,
        // Note: Removed createdById as it's not in your schema
      },
    })

    return NextResponse.json(menuCategory, { status: 201 })
  } catch (error) {
    console.error("[MENU_CATEGORIES_MANAGEMENT_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
