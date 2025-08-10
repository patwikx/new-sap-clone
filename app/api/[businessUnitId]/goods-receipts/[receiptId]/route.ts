import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function DELETE(
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
    const receiptId = req.headers.get("x-receipt-id") // Using a custom header for the receipt ID

    if (!businessUnitId || !receiptId) {
        return new NextResponse("Missing required headers: x-business-unit-id or x-receipt-id", { status: 400 });
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if receipt exists and can be deleted
    const existingReceipt = await prisma.receiving.findUnique({
      where: { id: receiptId },
      include: {
        items: true,
      },
    })

    if (!existingReceipt) {
      return new NextResponse("Goods receipt not found", { status: 404 })
    }

    // Check if there are any AP invoices based on this receipt's PO
    const hasInvoices = await prisma.aPInvoice.findFirst({
      where: {
        basePurchaseOrderId: existingReceipt.basePurchaseOrderId,
      },
    })

    if (hasInvoices) {
      return new NextResponse(
        "Cannot delete: an AP Invoice has already been created for the source Purchase Order.",
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Restore purchase order item open quantities and reverse inventory movements
      for (const item of existingReceipt.items) {
        if (item.purchaseOrderItemId) {
            await tx.purchaseOrderItem.update({
                where: { id: item.purchaseOrderItemId },
                data: {
                    openQuantity: {
                        increment: item.quantity,
                    },
                },
            });
        }

        if (item.inventoryItemId && item.locationId) {
          const stockRecord = await tx.inventoryStock.findFirst({
            where: {
              inventoryItemId: item.inventoryItemId,
              locationId: item.locationId,
            },
          })

          if (stockRecord) {
            await tx.inventoryStock.update({
              where: { id: stockRecord.id },
              data: {
                quantityOnHand: {
                  decrement: item.quantity,
                },
              },
            })

            // Create reversal movement
            await tx.inventoryMovement.create({
              data: {
                inventoryStockId: stockRecord.id,
                type: 'ADJUSTMENT',
                quantity: item.quantity.negated(), // Use .negated() for reversal
                reason: `Reversal of goods receipt ${existingReceipt.docNum}`,
                receivingItemId: item.id,
              },
            })
          }
        }
      }

      // Finally, delete the receipt itself
      await tx.receiving.delete({
        where: { id: receiptId },
      })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[GOODS_RECEIPT_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
