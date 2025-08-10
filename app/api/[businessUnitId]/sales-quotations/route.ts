import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface SalesQuotationLineInput {
  menuItemId: string
  quantity: string
  unitPrice: string
  discount?: string
  description?: string
}

interface SalesQuotationBodyInput {
  bpCode: string
  validUntil: string
  documentDate?: string
  postingDate?: string
  remarks?: string
  items: SalesQuotationLineInput[]
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

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const salesQuotations = await prisma.salesQuotation.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        businessPartner: {
          select: {
            name: true,
          },
        },
        owner: {
          select: {
            name: true,
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
      orderBy: [{ createdAt: "desc" }, { docNum: "desc" }],
    })

    // Transform the response to include menuItemId
    const quotationsWithTotals = salesQuotations.map((quotation) => ({
      ...quotation,
      items: quotation.items.map((item) => ({
        ...item,
        menuItemId: item.menuItem.id,
      })),
      totalAmount: quotation.items.reduce((sum: number, item) => {
        const qty = Number.parseFloat(item.quantity.toString())
        const price = Number.parseFloat(item.unitPrice.toString())
        return sum + qty * price
      }, 0),
    }))

    return NextResponse.json(quotationsWithTotals)
  } catch (error) {
    console.error("[SALES_QUOTATIONS_GET]", error)
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

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body: SalesQuotationBodyInput = await req.json()
    const { bpCode, validUntil, documentDate, postingDate, remarks, items } = body

    if (!bpCode || !validUntil || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Use provided dates or default to today
    const docDate = documentDate ? new Date(documentDate) : new Date()
    const postDate = postingDate ? new Date(postingDate) : new Date()

    const customer = await prisma.businessPartner.findFirst({
      where: {
        bpCode,
        businessUnitId,
        type: "CUSTOMER",
      },
    })

    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 })
    }

    const numberingSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: "SALES_QUOTATION",
      },
    })

    if (!numberingSeries) {
      return new NextResponse("No numbering series found for sales quotations", { status: 400 })
    }

    const docNum = `${numberingSeries.prefix}${numberingSeries.nextNumber.toString().padStart(5, "0")}`

    // Get menu items to populate descriptions
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: {
          in: items.map((item) => item.menuItemId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    })

    const menuItemMap = new Map(menuItems.map((item) => [item.id, { name: item.name }]))

    const salesQuotation = await prisma.$transaction(async (tx) => {
      await tx.numberingSeries.update({
        where: { id: numberingSeries.id },
        data: { nextNumber: numberingSeries.nextNumber + 1 },
      })

      const quotation = await tx.salesQuotation.create({
        data: {
          docNum,
          documentDate: docDate,
          postingDate: postDate,
          validUntil: new Date(validUntil),
          remarks,
          status: "OPEN",
          businessUnit: { connect: { id: businessUnitId } },
          owner: { connect: { id: session.user.id! } },
          businessPartner: { connect: { bpCode: bpCode } },
          items: {
            create: items.map((item: SalesQuotationLineInput) => {
              const qty = Number.parseFloat(item.quantity)
              const price = Number.parseFloat(item.unitPrice)
              const lineTotal = qty * price
              const menuItemInfo = menuItemMap.get(item.menuItemId)

              return {
                description: item.description || menuItemInfo?.name || "Item",
                quantity: new Prisma.Decimal(qty),
                unitPrice: new Prisma.Decimal(price),
                lineTotal: new Prisma.Decimal(lineTotal),
                menuItem: { connect: { id: item.menuItemId } },
              }
            }),
          },
        },
        include: {
          businessPartner: {
            select: {
              name: true,
            },
          },
          owner: {
            select: {
              name: true,
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
      })

      return quotation
    })

    return NextResponse.json(salesQuotation, { status: 201 })
  } catch (error) {
    console.error("[SALES_QUOTATIONS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
