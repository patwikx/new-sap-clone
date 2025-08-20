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

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      include: {
        glMappings: {
          where: { businessUnitId },
          include: {
            glAccount: {
              select: {
                accountCode: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform to match expected interface
    const methodsWithMappings = paymentMethods.map(method => ({
      ...method,
      glMapping: method.glMappings[0] || null,
      glMappings: undefined // Remove the array to avoid confusion
    }))

    return NextResponse.json(methodsWithMappings)
  } catch (error) {
    console.error("[PAYMENT_METHODS_WITH_MAPPINGS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}