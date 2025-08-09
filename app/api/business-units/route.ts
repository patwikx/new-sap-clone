import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if this is a request for all business units (admin view)
    const includeAll = req.nextUrl.searchParams.get('includeAll') === 'true'
    
    if (includeAll) {
      // Check if user is admin in any business unit
      const isAdmin = session.user.assignments.some(
        (assignment) => assignment.role.role === 'Admin'
      )
      
      if (!isAdmin) {
        return new NextResponse("Forbidden", { status: 403 })
      }
      
      const businessUnits = await prisma.businessUnit.findMany({
        orderBy: {
          name: 'asc'
        }
      })
      
      return NextResponse.json(businessUnits)
    } else {
      // Get all business units that the user has access to
      const userBusinessUnitIds = session.user.assignments.map(a => a.businessUnitId)
      
      const businessUnits = await prisma.businessUnit.findMany({
        where: {
          id: {
            in: userBusinessUnitIds
          }
        },
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      })
      
      return NextResponse.json(businessUnits)
    }
  } catch (error) {
    console.error("[BUSINESS_UNITS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

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

    // Check if name already exists
    const existingUnit = await prisma.businessUnit.findFirst({
      where: { name }
    })

    if (existingUnit) {
      return new NextResponse("Business unit name already exists", { status: 409 })
    }

    const businessUnit = await prisma.businessUnit.create({
      data: {
        name,
        functionalCurrency,
        reportingCurrency: reportingCurrency || functionalCurrency
      }
    })

    return NextResponse.json(businessUnit, { status: 201 })
  } catch (error) {
    console.error("[BUSINESS_UNITS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}