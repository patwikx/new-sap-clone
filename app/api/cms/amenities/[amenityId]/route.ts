import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { amenityId: string } }
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

    const { amenityId } = params
    const body = await req.json()
    const { name, description, icon, category, isActive, sortOrder } = body

    if (!name || !icon || !category) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const amenity = await prisma.amenity.update({
      where: { id: amenityId },
      data: {
        name,
        description,
        icon,
        category,
        isActive,
        sortOrder,
        updatedById: session.user.id
      }
    })

    return NextResponse.json(amenity)
  } catch (error) {
    console.error("[AMENITY_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { amenityId: string } }
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

    const { amenityId } = params

    await prisma.amenity.delete({
      where: { id: amenityId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[AMENITY_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}