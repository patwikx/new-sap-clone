import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest
  // We no longer need params because we get both IDs from headers
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get both IDs from the headers to avoid the params error
    const businessUnitId = req.headers.get("x-business-unit-id")
    const requestId = req.headers.get("x-request-id")

    if (!businessUnitId || !requestId) {
        return new NextResponse("Missing required headers", { status: 400 });
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if request exists and can be approved
    const existingRequest = await prisma.purchaseRequest.findUnique({
      where: { id: requestId }
    })

    if (!existingRequest) {
      return new NextResponse("Purchase request not found", { status: 404 })
    }

    if (existingRequest.status !== 'PENDING') {
      return new NextResponse("Purchase request is not pending approval", { status: 400 })
    }

    // Approve the request
    const purchaseRequest = await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approverId: session.user.id,
        approvalDate: new Date()
      },
      include: {
        requestor: {
          select: {
            name: true
          }
        },
        approver: {
          select: {
            name: true
          }
        },
        items: {
          include: {
            uom: {
              select: {
                symbol: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(purchaseRequest)
  } catch (error) {
    console.error("[PURCHASE_REQUEST_APPROVE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
