import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface StockRequisitionLineInput {
  inventoryItemId: string
  requestedQuantity: string
  notes?: string
}

// This interface is corrected to match the fields in your Prisma Schema
interface StockRequisitionBodyInput {
  fromLocationId: string
  toLocationId: string
  notes?: string // 'purpose', 'requestDate', 'requiredDate' do not exist
  items: StockRequisitionLineInput[]
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

    const stockRequisitions = await prisma.stockRequisition.findMany({
      where: {
        fromLocation: {
          businessUnitId: businessUnitId
        }
      },
      include: {
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        requestor: { select: { name: true } },
        fulfiller: { select: { name: true } },
        items: {
          include: {
            inventoryItem: {
              select: {
                name: true,
                itemCode: true,
                uom: {
                  select: {
                    symbol: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { requisitionNumber: 'desc' }
      ]
    })

    return NextResponse.json(stockRequisitions)
  } catch (error) {
    console.error("[STOCK_REQUISITIONS_GET]", error)
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

    const body: StockRequisitionBodyInput = await req.json()
    const { fromLocationId, toLocationId, notes, items } = body

    if (!fromLocationId || !toLocationId || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    if (fromLocationId === toLocationId) {
      return new NextResponse("From and To locations must be different", { status: 400 })
    }

    const [fromLocation, toLocation] = await Promise.all([
      prisma.inventoryLocation.findFirst({
        where: { id: fromLocationId, businessUnitId }
      }),
      prisma.inventoryLocation.findFirst({
        where: { id: toLocationId, businessUnitId }
      })
    ])

    if (!fromLocation || !toLocation) {
      return new NextResponse("Invalid location(s)", { status: 400 })
    }

    // Using a temporary number until numbering series is fully implemented
    const tempRequisitionNumber = `REQ-${Date.now()}`

    const stockRequisition = await prisma.$transaction(async (tx) => {
      const requisition = await tx.stockRequisition.create({
        data: {
          requisitionNumber: tempRequisitionNumber,
          fromLocationId,
          toLocationId,
          notes, // This is for the main document's notes
          status: 'PENDING',
          requestorId: session.user.id!,
          items: {
            create: items.map((item: StockRequisitionLineInput) => ({
              inventoryItemId: item.inventoryItemId,
              requestedQuantity: new Prisma.Decimal(item.requestedQuantity),
              // FIX: Removed 'notes' from here as it doesn't exist on StockRequisitionItem
            }))
          }
        },
        include: {
          fromLocation: { select: { name: true } },
          toLocation: { select: { name: true } },
          requestor: { select: { name: true } },
          items: {
            include: {
              inventoryItem: {
                select: {
                  name: true,
                  itemCode: true,
                  uom: {
                    select: {
                      symbol: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return requisition
    })

    return NextResponse.json(stockRequisition, { status: 201 })
  } catch (error) {
    console.error("[STOCK_REQUISITIONS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
