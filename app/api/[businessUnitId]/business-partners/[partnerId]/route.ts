import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; partnerId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, partnerId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { bpCode, name, type, phone, email, address, tinId, contactPerson, paymentTerms, creditLimit } = body

    if (!bpCode || !name || !type) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if BP code is taken by another partner
    const existingPartner = await prisma.businessPartner.findFirst({
      where: {
        bpCode,
        businessUnitId,
        NOT: { id: partnerId }
      }
    })

    if (existingPartner) {
      return new NextResponse("Business partner code already exists", { status: 409 })
    }

    const businessPartner = await prisma.businessPartner.update({
      where: { id: partnerId },
      data: {
        bpCode,
        name,
        type,
        phone,
        email,
        address,
        tinId,
        contactPerson,
        paymentTerms,
        creditLimit
      }
    })

    return NextResponse.json(businessPartner)
  } catch (error) {
    console.error("[BUSINESS_PARTNER_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; partnerId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, partnerId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await prisma.businessPartner.delete({
      where: { id: partnerId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[BUSINESS_PARTNER_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}