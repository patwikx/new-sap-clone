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

    const numberingSeries = await prisma.numberingSeries.findMany({
      where: {
        businessUnitId: businessUnitId
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(numberingSeries)
  } catch (error) {
    console.error("[NUMBERING_SERIES_GET]", error)
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
    const { name, prefix, nextNumber, documentType } = body

    if (!name || !prefix || !nextNumber || !documentType) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if name already exists in this business unit
    const existingSeries = await prisma.numberingSeries.findFirst({
      where: {
        name,
        businessUnitId
      }
    })

    if (existingSeries) {
      return new NextResponse("Numbering series name already exists", { status: 409 })
    }

    const numberingSeries = await prisma.numberingSeries.create({
      data: {
        name,
        prefix,
        nextNumber: parseInt(nextNumber),
        documentType,
        businessUnitId
      }
    })

    return NextResponse.json(numberingSeries, { status: 201 })
  } catch (error) {
    console.error("[NUMBERING_SERIES_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}