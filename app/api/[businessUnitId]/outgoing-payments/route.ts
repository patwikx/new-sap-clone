import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { includes } from "zod"

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

    const outgoingPayments = await prisma.outgoingPayment.findMany({
      where: {
        businessUnitId: businessUnitId
      },
      include: {
        businessPartner: {
          select: {
            name: true
          }
        },
        bankAccount: {
          select: {
            name: true,
            bankName: true
          }
        },
        applications: {
          include: {
            apInvoice: {
              select: {
                docNum: true,
                totalAmount: true
              }
            }
          }
        },
      createdBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { paymentDate: 'desc' },
        { docNum: 'desc' }
      ]
    })

    return NextResponse.json(outgoingPayments)
  } catch (error) {
    console.error("[OUTGOING_PAYMENTS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}