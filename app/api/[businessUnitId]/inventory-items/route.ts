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

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        uom: {
          select: {
            name: true,
            symbol: true
          }
        },
        // Include the stock levels and their locations
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
        name: 'asc'
      }
    })

    // Map the result to match the client-side interface (stockLevels -> stocks)
    const itemsWithStocks = inventoryItems.map(item => {
        const { stockLevels, ...rest } = item;
        return {
            ...rest,
            stocks: stockLevels
        }
    })

    return NextResponse.json(itemsWithStocks)
  } catch (error) {
    console.error("[INVENTORY_ITEMS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
