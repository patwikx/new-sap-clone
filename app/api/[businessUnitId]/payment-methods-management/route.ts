import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

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

    // Fetch all payment methods for the specified business unit
    // Note: Assuming PaymentMethod is not directly linked to a businessUnit in your schema.
    // If it is, add `businessUnitId: businessUnitId` to the where clause.
    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(paymentMethods)
  } catch (error) {
    console.error("[PAYMENT_METHODS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
