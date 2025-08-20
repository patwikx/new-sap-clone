import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"


export async function GET(req: NextRequest) {
  try {
    // No longer need to check for business unit
    const heroSections = await prisma.heroSection.findMany({
      where: {
        isActive: true, // Recommended for public fetching
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    return NextResponse.json(heroSections)
  } catch (error) {
    console.error("[HERO_SECTIONS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Simplified permission check: Does the user have an Admin role anywhere?
    const isGlobalAdmin = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!isGlobalAdmin) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { title, subtitle, backgroundImageUrl, ctaText, ctaLink, isActive, sortOrder } = body

    if (!title || !subtitle || !backgroundImageUrl || !ctaText || !ctaLink) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const heroSection = await prisma.heroSection.create({
      data: {
        title,
        subtitle,
        backgroundImageUrl,
        ctaText,
        ctaLink,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 1,
        // businessUnitId is removed
        createdById: session.user.id,
        updatedById: session.user.id
      }
    })

    return NextResponse.json(heroSection, { status: 201 })
  } catch (error) {
    console.error("[HERO_SECTIONS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}