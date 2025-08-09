import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

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
  } catch (error) {
    console.error("[BUSINESS_UNITS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}