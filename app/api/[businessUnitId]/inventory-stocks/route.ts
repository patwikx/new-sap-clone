import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

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

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const inventoryStocks = await prisma.inventoryStock.findMany({
      where: {
        inventoryItem: {
          businessUnitId: businessUnitId
        }
      },
      include: {
        inventoryItem: {
          include: { // Use include to get the full related model
            uom: {
              select: {
                symbol: true
              }
            },
            inventoryCategory: { // Include the new category
              select: {
                name: true
              }
            }
          }
        },
        location: {
          select: {
            id: true,
            name: true
          }
        },
        movements: {
          select: {
            id: true,
            type: true,
            quantity: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: [
        { inventoryItem: { name: 'asc' } },
        { location: { name: 'asc' } }
      ]
    })

    return NextResponse.json(inventoryStocks)
  } catch (error) {
    console.error("[INVENTORY_STOCKS_GET]", error)
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

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { inventoryStockId, adjustmentType, quantity, reason, notes } = body

    if (!inventoryStockId || !adjustmentType || !quantity || !reason) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const adjustmentQuantity = parseFloat(quantity)
    if (adjustmentQuantity === 0) {
      return new NextResponse("Adjustment quantity cannot be zero", { status: 400 })
    }

    // Get the stock record
    const stockRecord = await prisma.inventoryStock.findUnique({
      where: { id: inventoryStockId },
      include: {
        inventoryItem: {
          select: {
            businessUnitId: true,
            name: true
          }
        }
      }
    })

    if (!stockRecord) {
      return new NextResponse("Stock record not found", { status: 404 })
    }

    if (stockRecord.inventoryItem.businessUnitId !== businessUnitId) {
      return new NextResponse("Stock record does not belong to this business unit", { status: 403 })
    }

    // For decrease adjustments, ensure we don't go below zero
    if (adjustmentType === 'DECREASE') {
      const currentStock = parseFloat(stockRecord.quantityOnHand.toString())
      if (adjustmentQuantity > currentStock) {
        return new NextResponse("Cannot decrease stock below zero", { status: 400 })
      }
    }

    // Create the adjustment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Determine the change in quantity
      const quantityChange = adjustmentType === 'INCREASE' 
        ? new Prisma.Decimal(adjustmentQuantity) 
        : new Prisma.Decimal(-adjustmentQuantity)

      // Update the stock quantity
      const updatedStock = await tx.inventoryStock.update({
        where: { id: inventoryStockId },
        data: {
          quantityOnHand: {
            increment: quantityChange
          }
        }
      })

      // Create the movement record
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryStockId,
          type: 'ADJUSTMENT', // Corrected to use the valid enum value
          quantity: quantityChange, // Record the actual change (+ or -)
          reason: `${reason}${notes ? ` - ${notes}` : ''}`,
          createdById: session.user.id
        }
      })

      return { updatedStock, movement }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[STOCK_ADJUSTMENTS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
