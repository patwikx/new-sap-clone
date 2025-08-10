import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, PurchaseOrderItem, DocumentStatus } from "@prisma/client"

interface PurchaseOrderLineInput {
  description: string
  inventoryItemId?: string
  quantity: string
  unitPrice: string
  glAccountId?: string // Made optional to align with schema
}

interface PurchaseOrderBodyInput {
  bpCode: string
  documentDate: string
  postingDate: string
  deliveryDate: string
  purchaseRequestId: string // Changed to be required to match the schema
  remarks?: string
  items: PurchaseOrderLineInput[]
}

// Define a type for the items returned in the GET request
type PurchaseOrderItemWithDetails = PurchaseOrderItem & {
    inventoryItem: { name: string } | null;
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
    const hasOpenItemsParam = url.searchParams.get("hasOpenItems")

    const whereClause: Prisma.PurchaseOrderWhereInput = {
      businessUnitId: businessUnitId
    }

    if (statusParam) {
      whereClause.status = statusParam as DocumentStatus
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        businessPartner: {
          select: {
            name: true
          }
        },
        owner: {
          select: {
            name: true
          }
        },
        purchaseRequest: {
          select: {
            prNumber: true
          }
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { postingDate: 'desc' },
        { poNumber: 'desc' }
      ]
    })

    let filteredOrders = purchaseOrders
    if (hasOpenItemsParam === 'true') {
      filteredOrders = purchaseOrders.filter(order => 
        order.items.some(item => parseFloat(item.openQuantity.toString()) > 0)
      )
    }

    const ordersWithAmounts = filteredOrders.map(order => ({
      ...order,
      amountReceived: order.items.reduce((sum: number, item: PurchaseOrderItem) => {
        const received = parseFloat(item.quantity.toString()) - parseFloat(item.openQuantity.toString())
        return sum + (received * parseFloat(item.unitPrice.toString()))
      }, 0)
    }))

    return NextResponse.json(ordersWithAmounts)
  } catch (error) {
    console.error("[PURCHASE_ORDERS_GET]", error)
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

    const body: PurchaseOrderBodyInput = await req.json()
    const { bpCode, documentDate, postingDate, deliveryDate, purchaseRequestId, remarks, items } = body

    // Added purchaseRequestId to the validation check
    if (!bpCode || !documentDate || !postingDate || !deliveryDate || !purchaseRequestId || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const vendor = await prisma.businessPartner.findFirst({
      where: {
        bpCode,
        businessUnitId,
        type: 'VENDOR' // Corrected type check
      }
    })

    if (!vendor) {
      return new NextResponse("Vendor not found", { status: 404 })
    }

    const numberingSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: 'PURCHASE_ORDER'
      }
    })

    if (!numberingSeries) {
      return new NextResponse("No numbering series found for purchase orders", { status: 400 })
    }

    const poNumber = `${numberingSeries.prefix}${numberingSeries.nextNumber.toString().padStart(5, '0')}`

    const totalAmount = items.reduce((sum: number, item: PurchaseOrderLineInput) => {
      const qty = parseFloat(item.quantity)
      const price = parseFloat(item.unitPrice)
      return sum + (qty * price)
    }, 0)

    const purchaseOrder = await prisma.$transaction(async (tx) => {
      await tx.numberingSeries.update({
        where: { id: numberingSeries.id },
        data: { nextNumber: numberingSeries.nextNumber + 1 }
      })

      const order = await tx.purchaseOrder.create({
        data: {
          poNumber,
          documentDate: new Date(documentDate),
          postingDate: new Date(postingDate),
          deliveryDate: new Date(deliveryDate),
          remarks,
          status: 'OPEN',
          totalAmount: new Prisma.Decimal(totalAmount),
          businessUnit: { connect: { id: businessUnitId } },
          owner: { connect: { id: session.user.id! } },
          businessPartner: { connect: { bpCode: bpCode } },
          // Corrected: The relation is now mandatory, so we connect it directly
          purchaseRequest: { connect: { id: purchaseRequestId } },
          items: {
            create: items.map((item: PurchaseOrderLineInput) => {
              const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice)
              return {
                description: item.description,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: new Prisma.Decimal(item.unitPrice),
                lineTotal: new Prisma.Decimal(lineTotal),
                openQuantity: new Prisma.Decimal(item.quantity),
                inventoryItem: item.inventoryItemId ? { connect: { id: item.inventoryItemId } } : undefined,
                glAccount: item.glAccountId ? { connect: { id: item.glAccountId } } : undefined
              }
            })
          }
        },
        include: {
          businessPartner: {
            select: {
              name: true
            }
          },
          owner: {
            select: {
              name: true
            }
          },
          purchaseRequest: {
            select: {
              prNumber: true
            }
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      return order
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error("[PURCHASE_ORDERS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
