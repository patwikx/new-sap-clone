import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

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

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const url = new URL(req.url)
    const typeFilter = url.searchParams.get("type")

    const whereClause: Prisma.BusinessPartnerWhereInput = {
      businessUnitId: businessUnitId,
    }

    // Filter by business partner type if specified
    if (typeFilter && ["CUSTOMER", "VENDOR", "LEAD"].includes(typeFilter)) {
      whereClause.type = typeFilter as "CUSTOMER" | "VENDOR" | "LEAD"
    }

    const businessPartners = await prisma.businessPartner.findMany({
      where: whereClause,
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(businessPartners)
  } catch (error) {
    console.error("[BUSINESS_PARTNERS_GET]", error)
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
      (assignment) => assignment.businessUnitId === businessUnitId && assignment.role.role === "Admin",
    )
    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { bpCode, name, type, phone, email, address, tinId, contactPerson, paymentTerms, creditLimit } = body

    if (!bpCode || !name || !type) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if BP code already exists in this business unit
    const existingPartner = await prisma.businessPartner.findFirst({
      where: {
        bpCode,
        businessUnitId,
      },
    })

    if (existingPartner) {
      return new NextResponse("Business partner code already exists", { status: 409 })
    }

    const businessPartner = await prisma.businessPartner.create({
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
        creditLimit,
        businessUnitId,
      },
    })

    return NextResponse.json(businessPartner, { status: 201 })
  } catch (error) {
    console.error("[BUSINESS_PARTNERS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
