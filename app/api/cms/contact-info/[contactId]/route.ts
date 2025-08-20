import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { contactId: string } }
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

    const { contactId } = params
    const body = await req.json()
    const { type, label, value, iconName, isActive, sortOrder } = body

    if (!type || !label || !value || !iconName) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const validTypes = ['PHONE', 'EMAIL', 'ADDRESS', 'SOCIAL']
    if (!validTypes.includes(type)) {
      return new NextResponse(`Invalid contact type. Must be one of: ${validTypes.join(', ')}`, { status: 400 })
    }

    const contactInfo = await prisma.contactInfo.update({
      where: { id: contactId },
      data: {
        type,
        label,
        value,
        iconName,
        isActive,
        sortOrder,
        updatedById: session.user.id
      }
    })

    return NextResponse.json(contactInfo)
  } catch (error) {
    console.error("[CONTACT_INFO_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { contactId: string } }
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

    const { contactId } = params

    await prisma.contactInfo.delete({
      where: { id: contactId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[CONTACT_INFO_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}