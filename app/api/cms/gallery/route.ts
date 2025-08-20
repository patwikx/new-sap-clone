import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET handler for fetching public gallery images.
 * This is a public route and does not require authentication.
 * It supports filtering by a 'category' query parameter.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get("category")

    const whereClause: Prisma.GalleryImageWhereInput = {
      isActive: true,
    }

    if (category) {
      whereClause.category = category
    }

    const galleryImages = await prisma.galleryImage.findMany({
      where: whereClause,
      orderBy: {
        sortOrder: 'asc'
      }
    })

    return NextResponse.json(galleryImages)
  } catch (error) {
    console.error("[GALLERY_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

/**
 * POST handler for creating a new gallery image.
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
    const { title, description, imageUrl, category, tags, isActive, sortOrder } = body

    if (!imageUrl || !category) {
      return new NextResponse("Missing required fields: imageUrl and category", { status: 400 })
    }

    const galleryImage = await prisma.galleryImage.create({
      data: {
        title,
        description,
        imageUrl,
        category,
        tags: tags ?? [],
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 1,
        createdById: session.user.id,
        updatedById: session.user.id, // Added for consistency
      }
    })

    return NextResponse.json(galleryImage, { status: 201 })
  } catch (error) {
    console.error("[GALLERY_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
