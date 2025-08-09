import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { unitId } = params

    // Check if user is admin in any business unit
    const isAdmin = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!isAdmin) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { name, functionalCurrency, reportingCurrency } = body

    if (!name || !functionalCurrency) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if name is taken by another unit
    const existingUnit = await prisma.businessUnit.findFirst({
      where: {
        name,
        NOT: { id: unitId }
      }
    })

    if (existingUnit) {
      return new NextResponse("Business unit name already exists", { status: 409 })
    }

    const businessUnit = await prisma.businessUnit.update({
      where: { id: unitId },
      data: {
        name,
        functionalCurrency,
        reportingCurrency: reportingCurrency || functionalCurrency
      }
    })

    return NextResponse.json(businessUnit)
  } catch (error) {
    console.error("[BUSINESS_UNIT_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { unitId } = params

    // Check if user is admin in any business unit
    const isAdmin = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!isAdmin) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if business unit has any dependencies
    const hasUsers = await prisma.userBusinessUnit.findFirst({
      where: { businessUnitId: unitId }
    })

    if (hasUsers) {
      return new NextResponse("Cannot delete business unit with assigned users", { status: 400 })
    }

    await prisma.businessUnit.delete({
      where: { id: unitId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[BUSINESS_UNIT_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}