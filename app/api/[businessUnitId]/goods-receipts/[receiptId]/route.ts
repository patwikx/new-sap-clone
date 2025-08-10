import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id");
    const receiptId = req.headers.get("x-receipt-id"); // Use header

    if (!businessUnitId || !receiptId) {
      return new NextResponse("Missing required headers", { status: 400 });
    }

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const goodsReceipt = await prisma.receiving.findUnique({
      where: { id: receiptId },
      include: {
        basePurchaseOrder: {
          select: {
            poNumber: true,
            businessPartner: {
              select: {
                name: true,
                phone: true,
                email: true
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
                name: true
              }
            },
            location: { // Prisma uses 'location'
              select: {
                name: true
              }
            },
            purchaseOrderItem: {
              select: {
                description: true, // This was missing
                unitPrice: true
              }
            }
          }
        }
      }
    })

    if (!goodsReceipt) {
      return new NextResponse("Goods receipt not found", { status: 404 })
    }

    // Calculate totals
    const totalValue = goodsReceipt.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity.toString())
      const price = parseFloat(item.purchaseOrderItem?.unitPrice.toString() || "0")
      return sum + (qty * price)
    }, 0)

    const totalQuantity = goodsReceipt.items.reduce((sum, item) => 
      sum + parseFloat(item.quantity.toString()), 0)

    // **THE FIX**: Correctly restructure the response to match the client's expectation
    const responseData = {
      ...goodsReceipt,
      items: goodsReceipt.items.map(item => {
        const { location, ...restOfItem } = item;
        return {
          ...restOfItem,
          inventoryLocation: location // Rename 'location' to 'inventoryLocation'
        };
      }),
      totalValue,
      totalQuantity,
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[GOODS_RECEIPT_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
