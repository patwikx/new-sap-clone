import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET handler for fetching public contact information.
 * This is a public route and does not require authentication.
 */
export async function GET(req: NextRequest) {
  try {
    const contactInfo = await prisma.contactInfo.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    return NextResponse.json(contactInfo)
  } catch (error) {
    console.error("[CONTACT_INFO_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

/**
 * POST handler for creating a new contact info entry.
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
    const { type, label, value, iconName, isActive, sortOrder } = body

    if (!type || !label || !value || !iconName) {
      return new NextResponse("Missing required fields: type, label, value, and iconName", { status: 400 })
    }

    // Validate against the ContactType enum values
    const validTypes = ['PHONE', 'EMAIL', 'ADDRESS', 'SOCIAL']
    if (!validTypes.includes(type)) {
      return new NextResponse(`Invalid contact type. Must be one of: ${validTypes.join(', ')}`, { status: 400 })
    }

    const contactInfo = await prisma.contactInfo.create({
      data: {
        type,
        label,
        value,
        iconName,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 1,
        createdById: session.user.id,
        updatedById: session.user.id
      }
    })

    return NextResponse.json(contactInfo, { status: 201 })
  } catch (error) {
    console.error("[CONTACT_INFO_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
