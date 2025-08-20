import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { testimonialId: string } }
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

    const { testimonialId } = params
    const body = await req.json()
    const { guestName, guestTitle, content, rating, imageUrl, isActive, sortOrder } = body

    if (!guestName || !content || rating === undefined) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return new NextResponse("Rating must be between 1 and 5", { status: 400 })
    }

    const testimonial = await prisma.testimonial.update({
      where: { id: testimonialId },
      data: {
        guestName,
        guestTitle,
        content,
        rating,
        imageUrl,
        isActive,
        sortOrder,
      }
    })

    return NextResponse.json(testimonial)
  } catch (error) {
    console.error("[TESTIMONIAL_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { testimonialId: string } }
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

    const { testimonialId } = params

    await prisma.testimonial.delete({
      where: { id: testimonialId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[TESTIMONIAL_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}