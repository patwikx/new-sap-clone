import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface ARInvoiceLineInput {
  menuItemId: string
  quantity: string
  unitPrice: string
  discount?: string
  taxCodeId?: string
  glAccountId: string // Required field
  description?: string // Optional, will default to menu item name
}

interface ARInvoiceBodyInput {
  bpCode: string
  documentDate: string
  postingDate: string
  dueDate: string
  baseDeliveryId?: string // Changed from baseSalesOrderId
  remarks?: string
  items: ARInvoiceLineInput[]
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

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const url = new URL(req.url)
    const customerFilter = url.searchParams.get("customer")
    const statusFilter = url.searchParams.get("status")

    const whereClause: Prisma.ARInvoiceWhereInput = {
      businessUnitId: businessUnitId
    }

    if (customerFilter) {
      whereClause.bpCode = customerFilter
    }

    if (statusFilter && ['OPEN', 'CLOSED', 'CANCELLED'].includes(statusFilter)) {
      whereClause.status = statusFilter as 'OPEN' | 'CLOSED' | 'CANCELLED'
    }

    const arInvoices = await prisma.aRInvoice.findMany({
      where: whereClause,
      include: {
        businessPartner: {
          select: {
            name: true
          }
        },
        baseDelivery: { // Changed from baseSalesOrder
          select: {
            docNum: true,
            baseSalesOrder: {
              select: {
                docNum: true // Changed from soNumber
              }
            }
          }
        },
        items: {
          include: {
            menuItem: {
              select: {
                name: true
              }
            },
            glAccount: {
              select: {
                name: true,
                accountCode: true
              }
            }
          }
        }
      },
      orderBy: [
        { postingDate: 'desc' },
        { docNum: 'desc' }
      ]
    })

    return NextResponse.json(arInvoices)
  } catch (error) {
    console.error("[AR_INVOICES_GET]", error)
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

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body: ARInvoiceBodyInput = await req.json()
    const { bpCode, documentDate, postingDate, dueDate, baseDeliveryId, remarks, items } = body

    if (!bpCode || !documentDate || !postingDate || !dueDate || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Validate all items have required fields
    for (const item of items) {
      if (!item.glAccountId) {
        return new NextResponse("GL Account is required for all items", { status: 400 })
      }
    }

    const customer = await prisma.businessPartner.findFirst({
      where: {
        bpCode,
        businessUnitId,
        type: 'CUSTOMER' // Removed 'BOTH' as it doesn't exist in the enum
      }
    })

    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 })
    }

    const numberingSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: 'AR_INVOICE'
      }
    })

    if (!numberingSeries) {
      return new NextResponse("No numbering series found for AR invoices", { status: 400 })
    }

    const docNum = `${numberingSeries.prefix}${numberingSeries.nextNumber.toString().padStart(5, '0')}`

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity)
      const price = parseFloat(item.unitPrice)
      const discount = item.discount ? parseFloat(item.discount) : 0
      return sum + ((qty * price) - discount)
    }, 0)

    // For now, we'll use a simple 12% VAT calculation
    const taxAmount = subtotal * 0.12
    const totalAmount = subtotal + taxAmount

    const arInvoice = await prisma.$transaction(async (tx) => {
      await tx.numberingSeries.update({
        where: { id: numberingSeries.id },
        data: { nextNumber: numberingSeries.nextNumber + 1 }
      })

      // Get menu items to populate descriptions
      const menuItems = await tx.menuItem.findMany({
        where: {
          id: {
            in: items.map(item => item.menuItemId)
          }
        },
        select: {
          id: true,
          name: true
        }
      })

      const menuItemMap = new Map(menuItems.map(item => [item.id, item.name]))

      const invoice = await tx.aRInvoice.create({
        data: {
          docNum,
          documentDate: new Date(documentDate),
          postingDate: new Date(postingDate),
          dueDate: new Date(dueDate),
          remarks,
          status: 'OPEN',
          settlementStatus: 'OPEN',
          totalAmount: new Prisma.Decimal(totalAmount),
          amountPaid: new Prisma.Decimal(0),
          businessUnit: { connect: { id: businessUnitId } },
          businessPartner: { connect: { bpCode: bpCode } },
          baseDelivery: baseDeliveryId ? { connect: { id: baseDeliveryId } } : undefined,
          items: {
            create: items.map((item: ARInvoiceLineInput) => {
              const qty = parseFloat(item.quantity)
              const price = parseFloat(item.unitPrice)
              const discount = item.discount ? parseFloat(item.discount) : 0
              const lineTotal = (qty * price) - discount
              
              return {
                description: item.description || menuItemMap.get(item.menuItemId) || 'Item',
                quantity: new Prisma.Decimal(qty),
                unitPrice: new Prisma.Decimal(price),
                lineTotal: new Prisma.Decimal(lineTotal),
                menuItem: { connect: { id: item.menuItemId } },
                glAccount: { connect: { id: item.glAccountId } }
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
          items: {
            include: {
              menuItem: {
                select: {
                  name: true
                }
              },
              glAccount: {
                select: {
                  name: true,
                  accountCode: true
                }
              }
            }
          }
        }
      })

      return invoice
    })

    return NextResponse.json(arInvoice, { status: 201 })
  } catch (error) {
    console.error("[AR_INVOICES_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
