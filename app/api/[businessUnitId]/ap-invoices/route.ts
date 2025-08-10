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

    const apInvoices = await prisma.aPInvoice.findMany({
      where: {
        businessUnitId: businessUnitId
      },
      include: {
        businessPartner: {
          select: {
            name: true
          }
        },
        basePurchaseOrder: {
          select: {
            poNumber: true
          }
        },
        items: {
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
      orderBy: [
        { postingDate: 'desc' },
        { docNum: 'desc' }
      ]
    })

    return NextResponse.json(apInvoices)
  } catch (error) {
    console.error("[AP_INVOICES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}