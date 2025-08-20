import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { heroId: string } }
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

    const { heroId } = params
    const body = await req.json()
    const { title, subtitle, backgroundImageUrl, ctaText, ctaLink, isActive, sortOrder } = body

    if (!title || !subtitle || !backgroundImageUrl || !ctaText || !ctaLink) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const heroSection = await prisma.heroSection.update({
      where: { id: heroId },
      data: {
        title,
        subtitle,
        backgroundImageUrl,
        ctaText,
        ctaLink,
        isActive,
        sortOrder,
        updatedById: session.user.id
      }
    })

    return NextResponse.json(heroSection)
  } catch (error) {
    console.error("[HERO_SECTION_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { heroId: string } }
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

    const { heroId } = params

    await prisma.heroSection.delete({
      where: { id: heroId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[HERO_SECTION_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}