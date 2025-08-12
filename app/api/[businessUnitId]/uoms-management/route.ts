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

    // Fetch all UoMs for the specified business unit
    const uoms = await prisma.uoM.findMany({
      where: {
        // Assuming UoM is not directly tied to a business unit in your schema.
        // If it is, you would add: businessUnitId: businessUnitId
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(uoms)
  } catch (error) {
    console.error("[UOMS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
