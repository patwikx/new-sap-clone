import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, ReceivingItem } from "@prisma/client"

interface GoodsReceiptLineInput {
  purchaseOrderItemId: string
  quantityReceived: string
  inventoryLocationId: string
  batchNumber?: string
  expiryDate?: string
  notes?: string
}

interface GoodsReceiptBodyInput {
  purchaseOrderId: string
  documentDate: string
  postingDate: string
  deliveryNote?: string
  remarks?: string
  items: GoodsReceiptLineInput[]
}

// Define a type for the items returned in the GET request to avoid using 'any'
type ReceivingItemWithDetails = ReceivingItem & {
  purchaseOrderItem: {
    unitPrice: Prisma.Decimal;
  } | null;
};

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

    const goodsReceipts = await prisma.receiving.findMany({
      where: {
        businessUnitId: businessUnitId
      },
      include: {
        basePurchaseOrder: {
          select: {
            poNumber: true,
            businessPartner: {
              select: {
                name: true
              }
            }
          }
        },
        receivedBy: {
          select: {
            name: true
          }
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                name: true,
              },
            },
            location: {
              select: {
                name: true
              }
            },
            purchaseOrderItem: {
              select: {
                description: true,
                unitPrice: true
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

    // Calculate totals for each receipt
    const receiptsWithTotals = goodsReceipts.map(receipt => {
        const totalValue = receipt.items.reduce((sum, item) => {
            // FIX: Add a guard clause to safely handle items without a PO link
            if (!item.purchaseOrderItem) {
                return sum;
            }
            const qty = parseFloat(item.quantity.toString())
            const price = parseFloat(item.purchaseOrderItem.unitPrice.toString())
            return sum + (qty * price)
        }, 0)

        return {
            ...receipt,
            totalQuantity: receipt.items.reduce((sum, item) => 
                sum + parseFloat(item.quantity.toString()), 0),
            totalValue
        }
    })

    return NextResponse.json(receiptsWithTotals)
  } catch (error) {
    console.error("[GOODS_RECEIPTS_GET]", error)
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

    const body: GoodsReceiptBodyInput = await req.json()
    const { purchaseOrderId, documentDate, postingDate, deliveryNote, remarks, items } = body

    if (!purchaseOrderId || !documentDate || !postingDate || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        items: true
      }
    })

    if (!purchaseOrder) {
      return new NextResponse("Purchase order not found", { status: 404 })
    }

    if (purchaseOrder.status !== 'OPEN') {
      return new NextResponse("Purchase order is not open", { status: 400 })
    }

    for (const item of items) {
      const poItem = purchaseOrder.items.find(poi => poi.id === item.purchaseOrderItemId)
      if (!poItem) {
        return new NextResponse(`Purchase order item not found: ${item.purchaseOrderItemId}`, { status: 400 })
      }
      
      const qtyReceiving = parseFloat(item.quantityReceived)
      const openQty = parseFloat(poItem.openQuantity.toString())
      
      if (qtyReceiving > openQty) {
        return new NextResponse(`Cannot receive more than open quantity for item: ${poItem.description}`, { status: 400 })
      }
    }

    const numberingSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: 'GOODS_RECEIPT_PO'
      }
    })

    if (!numberingSeries) {
      return new NextResponse("No numbering series found for goods receipts", { status: 400 })
    }

    const docNum = `${numberingSeries.prefix}${numberingSeries.nextNumber.toString().padStart(5, '0')}`

    const goodsReceipt = await prisma.$transaction(async (tx) => {
      await tx.numberingSeries.update({
        where: { id: numberingSeries.id },
        data: { nextNumber: numberingSeries.nextNumber + 1 }
      })

      const receipt = await tx.receiving.create({
        data: {
          docNum,
          documentDate: new Date(documentDate),
          postingDate: new Date(postingDate),
          deliveryNote,
          remarks,
          basePurchaseOrder: { connect: { id: purchaseOrderId } },
          businessUnit: { connect: { id: businessUnitId } },
          receivedBy: { connect: { id: session.user.id! } },
          items: {
            create: items.map((item: GoodsReceiptLineInput) => {
                const poItem = purchaseOrder.items.find(poi => poi.id === item.purchaseOrderItemId)!;
                return {
                    quantity: new Prisma.Decimal(item.quantityReceived),
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                    notes: item.notes,
                    location: { connect: { id: item.inventoryLocationId } },
                    purchaseOrderItem: { connect: { id: item.purchaseOrderItemId } },
                    inventoryItem: { connect: { id: poItem.inventoryItemId! } }
                };
            })
          }
        },
        include: {
          items: true 
        }
      })

      for (const item of items) {
        const qtyReceived = new Prisma.Decimal(item.quantityReceived)
        await tx.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: {
            openQuantity: {
              decrement: qtyReceived
            }
          }
        })
      }

      for (const item of receipt.items) {
        const poItem = purchaseOrder.items.find(poi => poi.id === item.purchaseOrderItemId)!
        if (poItem?.inventoryItemId) {
          const existingStock = await tx.inventoryStock.findFirst({
            where: {
              inventoryItemId: poItem.inventoryItemId,
              locationId: item.locationId!
            }
          })

          let stockRecordId: string;

          if (existingStock) {
            const updatedStock = await tx.inventoryStock.update({
              where: { id: existingStock.id },
              data: {
                quantityOnHand: {
                  increment: new Prisma.Decimal(item.quantity)
                }
              }
            })
            stockRecordId = updatedStock.id;
          } else {
            const newStock = await tx.inventoryStock.create({
              data: {
                inventoryItemId: poItem.inventoryItemId,
                locationId: item.locationId!,
                quantityOnHand: new Prisma.Decimal(item.quantity),
                reorderPoint: new Prisma.Decimal(0)
              }
            })
            stockRecordId = newStock.id;
          }

          await tx.inventoryMovement.create({
            data: {
              inventoryStockId: stockRecordId,
              type: 'RECEIVING',
              quantity: new Prisma.Decimal(item.quantity),
              reason: `Goods receipt ${docNum}`,
              receivingItemId: item.id
            }
          })
        }
      }

      return receipt
    })

    return NextResponse.json(goodsReceipt, { status: 201 })
  } catch (error) {
    console.error("[GOODS_RECEIPTS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
