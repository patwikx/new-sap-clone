import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, PurchaseRequestItem, PurchaseRequestStatus } from "@prisma/client"

interface PurchaseRequestLineInput {
  description: string
  inventoryItemId?: string
  requestedQuantity: string
  uomId: string
  estimatedPrice?: string
  notes?: string
}

interface PurchaseRequestBodyInput {
  requestDate: string
  requiredDate: string
  priority: string
  justification?: string
  items: PurchaseRequestLineInput[]
}

// Define a specific type for the items returned in the GET request
type PurchaseRequestItemWithDetails = PurchaseRequestItem & {
    inventoryItem: { name: string } | null;
    uom: { symbol: string } | null;
}

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

    const url = new URL(req.url)
    const statusParam = url.searchParams.get("status")

    // Use Prisma's generated type for the where clause
    const whereClause: Prisma.PurchaseRequestWhereInput = {
      businessUnitId: businessUnitId
    }

    if (statusParam) {
      // Cast the status string to the Prisma enum type
      whereClause.status = statusParam as PurchaseRequestStatus
    }

    const purchaseRequests = await prisma.purchaseRequest.findMany({
      where: whereClause,
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
      },
      orderBy: [
        { createdAt: 'desc' }, // Corrected from requestDate to createdAt
        { prNumber: 'desc' }
      ]
    })

    // Calculate total estimated amount for each request
    const requestsWithTotals = purchaseRequests.map(request => ({
      ...request,
      totalEstimatedAmount: request.items.reduce((sum: number, item: PurchaseRequestItem) => {
        const qty = parseFloat(item.requestedQuantity.toString())
        // The 'estimatedPrice' field does not exist on the PurchaseRequestItem model
        // This calculation needs to be adjusted or the field added to the schema.
        // For now, returning 0 to prevent a crash.
        const price = 0; 
        return sum + (qty * price)
      }, 0)
    }))

    return NextResponse.json(requestsWithTotals)
  } catch (error) {
    console.error("[PURCHASE_REQUESTS_GET]", error)
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

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body: PurchaseRequestBodyInput = await req.json()
    // 'priority' and 'requiredDate' do not exist on the model
    const { requestDate, justification, items } = body

    if (!requestDate || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const numberingSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: 'PURCHASE_REQUEST'
      }
    })

    if (!numberingSeries) {
      return new NextResponse("No numbering series found for purchase requests", { status: 400 })
    }

    const prNumber = `${numberingSeries.prefix}${numberingSeries.nextNumber.toString().padStart(5, '0')}`

    const purchaseRequest = await prisma.$transaction(async (tx) => {
      await tx.numberingSeries.update({
        where: { id: numberingSeries.id },
        data: { nextNumber: numberingSeries.nextNumber + 1 }
      })

      const request = await tx.purchaseRequest.create({
        data: {
          prNumber,
          // 'requestDate', 'requiredDate', 'priority', 'justification' do not exist on the model
          // Using 'notes' for justification as a placeholder
          notes: justification,
          status: 'PENDING',
          businessUnitId,
          requestorId: session.user.id!,
          items: {
            create: items.map((item: PurchaseRequestLineInput) => ({
              description: item.description,
              requestedQuantity: new Prisma.Decimal(item.requestedQuantity),
              notes: item.notes,
              uom: { connect: { id: item.uomId } }
              // 'inventoryItemId' and 'estimatedPrice' do not exist on the item model
            }))
          }
        },
        include: {
          requestor: {
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

      return request
    })

    return NextResponse.json(purchaseRequest, { status: 201 })
  } catch (error) {
    console.error("[PURCHASE_REQUESTS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
