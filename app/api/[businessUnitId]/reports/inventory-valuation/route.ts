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

    const url = new URL(req.url)
    const asOfDate = url.searchParams.get("endDate") || new Date().toISOString().split('T')[0]
    const includeZeroBalances = url.searchParams.get("includeZeroBalances") === "true"

    // Get inventory items with their stock levels
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        businessUnitId: businessUnitId,
        isActive: true
      },
      include: {
        uom: {
          select: {
            symbol: true
          }
        },
        inventoryCategory: {
          select: {
            name: true
          }
        },
        stockLevels: {
          include: {
            location: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        itemCode: 'asc'
      }
    })

    // Calculate valuation for each item
    const itemsWithValuation = inventoryItems.map(item => {
      const standardCost = item.standardCost ? parseFloat(item.standardCost.toString()) : 0
      
      const locations = item.stockLevels.map(stock => {
        const quantity = parseFloat(stock.quantityOnHand.toString())
        return {
          locationName: stock.location.name,
          quantityOnHand: quantity,
          standardCost,
          totalValue: quantity * standardCost
        }
      })

      const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantityOnHand, 0)
      const totalValue = locations.reduce((sum, loc) => sum + loc.totalValue, 0)
      const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : standardCost

      return {
        itemCode: item.itemCode,
        itemName: item.name,
        category: item.inventoryCategory?.name,
        uom: item.uom.symbol,
        locations,
        totalQuantity,
        totalValue,
        averageCost
      }
    }).filter(item => 
      includeZeroBalances || item.totalQuantity > 0
    )

    // Calculate summary
    const summary = {
      totalQuantity: itemsWithValuation.reduce((sum, item) => sum + item.totalQuantity, 0),
      totalValue: itemsWithValuation.reduce((sum, item) => sum + item.totalValue, 0),
      itemCount: itemsWithValuation.length,
      locationCount: new Set(
        itemsWithValuation.flatMap(item => item.locations.map(loc => loc.locationName))
      ).size
    }

    const inventoryValuationData = {
      asOfDate,
      items: itemsWithValuation,
      summary
    }

    return NextResponse.json(inventoryValuationData)
  } catch (error) {
    console.error("[INVENTORY_VALUATION_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}