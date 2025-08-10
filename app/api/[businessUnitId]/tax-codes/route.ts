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

    const whereClause: Prisma.TaxCodeWhereInput = {
      businessUnitId: businessUnitId,
      isActive: true,
    }

    const taxCodes = await prisma.taxCode.findMany({
      where: whereClause,
      orderBy: [{ code: "asc" }],
    })

    return NextResponse.json(taxCodes)
  } catch (error) {
    console.error("[TAX_CODES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
