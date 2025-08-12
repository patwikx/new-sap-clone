import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Read businessUnitId from the request headers
    const businessUnitId = req.headers.get('x-business-unit-id');

    if (!businessUnitId) {
      return new NextResponse("x-business-unit-id header is required", {
        status: 400,
      })
    }

    // Verify user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Fetch all tax codes for the specified business unit
    const taxCodes = await prisma.taxCode.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      orderBy: {
        code: 'asc'
      }
    })

    return NextResponse.json(taxCodes)
  } catch (error) {
    console.error("[TAX_CODES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
