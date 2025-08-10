import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

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

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const url = new URL(req.url)
    const statusFilter = url.searchParams.get("status")
    const uninvoicedFilter = url.searchParams.get("uninvoiced")

    const whereClause: Prisma.DeliveryWhereInput = {
      businessUnitId: businessUnitId,
    }

    if (statusFilter && ["OPEN", "CLOSED", "CANCELLED"].includes(statusFilter)) {
      whereClause.status = statusFilter as "OPEN" | "CLOSED" | "CANCELLED"
    }

    // Filter for deliveries that haven't been invoiced yet
    if (uninvoicedFilter === "true") {
      whereClause.arInvoice = null
    }

    const deliveries = await prisma.delivery.findMany({
      where: whereClause,
      include: {
        businessPartner: {
          select: {
            name: true,
          },
        },
        baseSalesOrder: {
          select: {
            docNum: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ postingDate: "desc" }, { docNum: "desc" }],
    })

    // Transform the data to match the expected interface
    const transformedDeliveries = deliveries.map((delivery) => ({
      ...delivery,
      items: delivery.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        description: item.description,
      })),
    }))

    return NextResponse.json(transformedDeliveries)
  } catch (error) {
    console.error("[DELIVERIES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
