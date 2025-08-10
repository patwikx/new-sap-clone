import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface SalesQuotationLineInput {
  menuItemId: string
  quantity: string
  unitPrice: string
  discount?: string
}

interface SalesQuotationBodyInput {
  bpCode: string
  validUntil: string
  remarks?: string
  items: SalesQuotationLineInput[]
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; quotationId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, quotationId } = params

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body: SalesQuotationBodyInput = await req.json()
    const { bpCode, validUntil, remarks, items } = body

    if (!bpCode || !validUntil || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if quotation exists and can be edited
    const existingQuotation = await prisma.salesQuotation.findUnique({
      where: { id: quotationId }
    })

    if (!existingQuotation) {
      return new NextResponse("Sales quotation not found", { status: 404 })
    }

    if (existingQuotation.status !== 'OPEN') {
      return new NextResponse("Cannot edit non-open quotation", { status: 400 })
    }

    const salesQuotation = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.salesQuotationItem.deleteMany({
        where: { salesQuotationId: quotationId }
      })

      // Update quotation
      const quotation = await tx.salesQuotation.update({
        where: { id: quotationId },
        data: {
          validUntil: new Date(validUntil),
          remarks,
          businessPartner: { connect: { bpCode: bpCode } },
          items: {
            create: items.map((item: SalesQuotationLineInput) => {
              const qty = parseFloat(item.quantity)
              const price = parseFloat(item.unitPrice)
              const discount = item.discount ? parseFloat(item.discount) : 0
              const lineTotal = (qty * price) - discount
              
              return {
                quantity: new Prisma.Decimal(qty),
                unitPrice: new Prisma.Decimal(price),
                discount: discount > 0 ? new Prisma.Decimal(discount) : null,
                lineTotal: new Prisma.Decimal(lineTotal),
                menuItem: { connect: { id: item.menuItemId } }
              }
            })
          }
        },
        include: {
          businessPartner: {
            select: {
              name: true
            }
          },
          owner: {
            select: {
              name: true
            }
          },
          items: {
            include: {
              menuItem: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      return quotation
    })

    return NextResponse.json(salesQuotation)
  } catch (error) {
    console.error("[SALES_QUOTATION_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; quotationId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, quotationId } = params

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if quotation exists and can be deleted
    const existingQuotation = await prisma.salesQuotation.findUnique({
      where: { id: quotationId }
    })

    if (!existingQuotation) {
      return new NextResponse("Sales quotation not found", { status: 404 })
    }

    if (existingQuotation.status === 'ACCEPTED') {
      return new NextResponse("Cannot delete accepted quotation", { status: 400 })
    }

    await prisma.salesQuotation.delete({
      where: { id: quotationId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[SALES_QUOTATION_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}