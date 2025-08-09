import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; periodId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, periodId } = params

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
    const { name, startDate, endDate, fiscalYear, periodNumber, type, status } = body

    if (!name || !startDate || !endDate || !fiscalYear || !periodNumber || !type) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if period already exists for this fiscal year and period number (excluding current)
    const existingPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        businessUnitId,
        fiscalYear: parseInt(fiscalYear),
        periodNumber: parseInt(periodNumber),
        NOT: { id: periodId }
      }
    })

    if (existingPeriod) {
      return new NextResponse("Accounting period already exists for this fiscal year and period", { status: 409 })
    }

    const accountingPeriod = await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        fiscalYear: parseInt(fiscalYear),
        periodNumber: parseInt(periodNumber),
        type,
        status: status || 'OPEN',
        updatedById: session.user.id
      },
      include: {
        createdBy: {
          select: {
            name: true
          }
        },
        updatedBy: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(accountingPeriod)
  } catch (error) {
    console.error("[ACCOUNTING_PERIOD_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; periodId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, periodId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await prisma.accountingPeriod.delete({
      where: { id: periodId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[ACCOUNTING_PERIOD_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}