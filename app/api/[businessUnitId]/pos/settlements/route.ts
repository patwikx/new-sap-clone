import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface SettlementInput {
  orderId: string
  paymentMethodId: string
  amountReceived: number
  discountId?: string
  discountAmount?: number
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessUnitId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId } = await params

    // Get headers for additional context
    const headerBusinessUnitId = req.headers.get("x-business-unit-id")

    // Validate headers match params
    if (headerBusinessUnitId && headerBusinessUnitId !== businessUnitId) {
      return new NextResponse("Business unit ID mismatch", { status: 400 })
    }

    // Check if user has access to this business unit
    const userAssignment = await prisma.userBusinessUnit.findFirst({
      where: {
        userId: session.user.id!,
        businessUnitId: businessUnitId,
      },
      include: {
        role: true,
      },
    })

    if (!userAssignment) {
      return new NextResponse("Forbidden - No access to business unit", { status: 403 })
    }

    const isAuthorized = userAssignment.role.role === "Admin" || userAssignment.role.role === "Cashier"
    if (!isAuthorized) {
      return new NextResponse("Forbidden - Insufficient permissions", { status: 403 })
    }

    const body: SettlementInput = await req.json()
    const { orderId, paymentMethodId, amountReceived, discountId, discountAmount } = body

    console.log("[POS_SETTLEMENTS_POST] Request body:", body)

    if (!orderId || !paymentMethodId || !amountReceived) {
      console.error("[POS_SETTLEMENTS_POST] Missing required fields:", { orderId, paymentMethodId, amountReceived })
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Validate payment method exists and is active
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    })

    if (!paymentMethod || !paymentMethod.isActive) {
      console.error("[POS_SETTLEMENTS_POST] Invalid payment method:", paymentMethodId)
      return new NextResponse("Invalid or inactive payment method", { status: 400 })
    }

    // Get the order with its items and current shift
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        items: {
          include: {
            menuItem: {
              include: {
                recipe: {
                  include: {
                    recipeItems: {
                      include: {
                        inventoryItem: {
                          include: {
                            stockLevels: {
                              include: {
                                location: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            modifiers: true,
          },
        },
        shift: true,
        discount: true,
      },
    })

    if (!order) {
      console.error("[POS_SETTLEMENTS_POST] Order not found:", orderId)
      return new NextResponse("Order not found", { status: 404 })
    }

    if (order.status === "PAID" || order.status === "CANCELLED") {
      console.error("[POS_SETTLEMENTS_POST] Order already completed:", order.status)
      return new NextResponse("Order is already completed", { status: 400 })
    }

    // Get current active shift if order doesn't have one
    let shiftId = order.shiftId
    if (!shiftId) {
      const activeShift = await prisma.shift.findFirst({
        where: {
          businessUnitId,
        },
      })

      if (!activeShift) {
        console.error("[POS_SETTLEMENTS_POST] No active shift found")
        return new NextResponse("No active shift found. Please start a shift first.", { status: 400 })
      }
      shiftId = activeShift.id
    }

    // Calculate totals - since OrderItem doesn't have lineTotal, calculate from priceAtSale * quantity
    const subtotal = order.items.reduce((sum, item) => {
      const itemTotal = Number.parseFloat(item.priceAtSale.toString()) * item.quantity
      // Add modifier costs
      const modifierTotal = item.modifiers.reduce((modSum, modifier) => {
        return modSum + Number.parseFloat(modifier.priceChange.toString()) * item.quantity
      }, 0)
      return sum + itemTotal + modifierTotal
    }, 0)

    const discount = discountAmount || 0
    const taxableAmount = subtotal - discount
    const tax = taxableAmount * 0.12 // 12% tax rate
    const finalTotal = taxableAmount + tax
    const change = amountReceived - finalTotal

    console.log("[POS_SETTLEMENTS_POST] Calculations:", {
      subtotal,
      discount,
      taxableAmount,
      tax,
      finalTotal,
      amountReceived,
      change,
    })

    if (change < 0) {
      console.error("[POS_SETTLEMENTS_POST] Insufficient payment:", { finalTotal, amountReceived, change })
      return new NextResponse(
        `Insufficient payment amount. Required: ${finalTotal.toFixed(2)}, Received: ${amountReceived.toFixed(2)}`,
        { status: 400 },
      )
    }

    const settlement = await prisma.$transaction(async (tx) => {
      // Create payment record using the existing Payment model
      const payment = await tx.payment.create({
        data: {
          orderId,
          paymentMethodId,
          amount: new Prisma.Decimal(amountReceived),
          processedByUserId: session.user.id!,
          shiftId: shiftId!,
          createdById: session.user.id!,
        },
      })

      // Update order status and totals
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          amountPaid: new Prisma.Decimal(amountReceived),
          isPaid: true,
          // Update calculated totals
          subTotal: new Prisma.Decimal(subtotal),
          tax: new Prisma.Decimal(tax),
          totalAmount: new Prisma.Decimal(finalTotal),
          // Apply discount if provided
          ...(discountId && { discountId }),
          ...(discount > 0 && { discountValue: new Prisma.Decimal(discount) }),
          // Update shift if it was missing
          ...(order.shiftId !== shiftId && { shiftId }),
        },
      })

      // Free up the table by setting status to AVAILABLE
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: {
            status: "AVAILABLE",
          },
        })
      }

      // Create inventory movements for sold items (depletion) - only if recipe exists
      for (const item of order.items) {
        if (item.menuItem.recipe) {
          const recipe = item.menuItem.recipe
          for (const recipeItem of recipe.recipeItems) {
            const quantityToDeplete = Number.parseFloat(recipeItem.quantityUsed.toString()) * item.quantity

            // Find stock level (assuming first available location for simplicity)
            const stockLevel = recipeItem.inventoryItem.stockLevels[0]
            if (stockLevel) {
              // Update stock level
              await tx.inventoryStock.update({
                where: { id: stockLevel.id },
                data: {
                  quantityOnHand: {
                    decrement: new Prisma.Decimal(quantityToDeplete),
                  },
                },
              })

              // Create inventory movement record
              await tx.inventoryMovement.create({
                data: {
                  inventoryStockId: stockLevel.id,
                  type: "SALE_DEPLETION",
                  quantity: new Prisma.Decimal(-quantityToDeplete), // Negative for depletion
                  reason: `Sale - Order ${order.id}`,
                  orderId: order.id,
                  createdById: session.user.id!,
                },
              })
            }
          }
        }
      }

      return {
        payment,
        order: {
          id: orderId,
          status: "PAID",
          subtotal,
          discount,
          tax,
          totalAmount: finalTotal,
          amountPaid: amountReceived,
          change: change > 0 ? change : 0,
          paidAt: new Date(),
        },
      }
    })

    console.log("[POS_SETTLEMENTS_POST] Settlement completed successfully")
    return NextResponse.json(settlement, { status: 201 })
  } catch (error) {
    console.error("[POS_SETTLEMENTS_POST] Error:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
