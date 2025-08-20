import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { galleryId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { galleryId } = params
    const body = await req.json()
    const { title, description, imageUrl, category, isActive, sortOrder } = body

    if (!imageUrl || !category) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const galleryImage = await prisma.galleryImage.update({
      where: { id: galleryId },
      data: {
        title,
        description,
        imageUrl,
        category,
        isActive,
        sortOrder,
        updatedById: session.user.id
      }
    })

    return NextResponse.json(galleryImage)
  } catch (error) {
    console.error("[GALLERY_IMAGE_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { galleryId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { galleryId } = params

    await prisma.galleryImage.delete({
      where: { id: galleryId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[GALLERY_IMAGE_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}