import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id")

    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      })
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const accountingPeriods = await prisma.accountingPeriod.findMany({
      where: {
        businessUnitId: businessUnitId
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
      },
      orderBy: [
        { fiscalYear: 'desc' },
        { periodNumber: 'desc' }
      ]
    })

    return NextResponse.json(accountingPeriods)
  } catch (error) {
    console.error("[ACCOUNTING_PERIODS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id")

    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      })
    }

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

    // Check if period already exists for this fiscal year and period number
    const existingPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        businessUnitId,
        fiscalYear: parseInt(fiscalYear),
        periodNumber: parseInt(periodNumber)
      }
    })

    if (existingPeriod) {
      return new NextResponse("Accounting period already exists for this fiscal year and period", { status: 409 })
    }

    const accountingPeriod = await prisma.accountingPeriod.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        fiscalYear: parseInt(fiscalYear),
        periodNumber: parseInt(periodNumber),
        type,
        status: status || 'OPEN',
        businessUnitId,
        createdById: session.user.id,
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

    return NextResponse.json(accountingPeriod, { status: 201 })
  } catch (error) {
    console.error("[ACCOUNTING_PERIODS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}