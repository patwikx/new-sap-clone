import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET handler for fetching public amenities.
 * This is a public route and does not require authentication.
 * It supports filtering by a 'category' query parameter.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get("category")

    const whereClause: Prisma.AmenityWhereInput = {
      isActive: true,
    }

    if (category) {
      whereClause.category = category
    }

    const amenities = await prisma.amenity.findMany({
      where: whereClause,
      orderBy: {
        sortOrder: 'asc'
      }
    })

    return NextResponse.json(amenities)
  } catch (error) {
    console.error("[AMENITIES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

/**
 * POST handler for creating a new amenity.
 * Requires authentication and a global 'Admin' role.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden: Admin role required", { status: 403 })
    }

    const body = await req.json()
    const { name, description, icon, category, isActive, sortOrder } = body

    if (!name || !icon || !category) {
      return new NextResponse("Missing required fields: name, icon, and category", { status: 400 })
    }

    const amenity = await prisma.amenity.create({
      data: {
        name,
        description,
        icon,
        category,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 1,
        createdById: session.user.id,
        updatedById: session.user.id,
      }
    })

    return NextResponse.json(amenity, { status: 201 })
  } catch (error) {
    console.error("[AMENITIES_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
