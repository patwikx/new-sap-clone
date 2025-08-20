import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    // Public route - no authentication required
    const testimonials = await prisma.testimonial.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    return NextResponse.json(testimonials)
  } catch (error) {
    console.error("[TESTIMONIALS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

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
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { guestName, guestTitle, content, rating, imageUrl, isActive, sortOrder } = body

    if (!guestName || !content || rating === undefined) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return new NextResponse("Rating must be between 1 and 5", { status: 400 })
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        guestName,
        guestTitle,
        content,
        rating,
        imageUrl,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 1,
        createdById: session.user.id,
      }
    })

    return NextResponse.json(testimonial, { status: 201 })
  } catch (error) {
    console.error("[TESTIMONIALS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}