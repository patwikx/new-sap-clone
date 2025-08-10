import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id");
    const { itemId } = params

    if (!businessUnitId) {
        return new NextResponse("Missing x-business-unit-id header", { status: 400 });
    }

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    // Correctly destructuring fields that exist on the InventoryItem model
    const { name, description, itemCode, uomId, standardCost, isActive } = body

    if (!name || !itemCode || !uomId) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        itemCode,
        businessUnitId,
        NOT: { id: itemId }
      }
    })

    if (existingItem) {
      return new NextResponse("Item code already exists", { status: 409 })
    }

    const inventoryItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        name,
        description,
        itemCode,
        standardCost,
        uomId,
        isActive
        // Removed reorderPoint and standardCost as they are not on this model
      },
      include: {
        uom: {
          select: {
            name: true,
            symbol: true
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
      }
    })

    return NextResponse.json(inventoryItem)
  } catch (error) {
    console.error("[INVENTORY_ITEM_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const businessUnitId = req.headers.get("x-business-unit-id");
    const { itemId } = params;

    if (!businessUnitId) {
        return new NextResponse("Missing x-business-unit-id header", { status: 400 });
    }

    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if item is being used in any transactions
    const [stockRecords, requisitionItems] = await Promise.all([
      prisma.inventoryStock.findFirst({ where: { inventoryItemId: itemId } }),
      prisma.stockRequisitionItem.findFirst({ where: { inventoryItemId: itemId } })
    ])

    if (stockRecords || requisitionItems) {
      return new NextResponse("Cannot delete item that has stock records or transactions", { status: 400 })
    }

    await prisma.inventoryItem.delete({
      where: { id: itemId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[INVENTORY_ITEM_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
