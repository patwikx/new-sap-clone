import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface PaymentApplicationInput {
  arInvoiceId: string
  amountApplied: string
}

interface IncomingPaymentBodyInput {
  bpCode: string
  paymentDate: string
  bankAccountId: string
  paymentMethodId: string // Add this back
  referenceNumber?: string
  remarks?: string
  applications: PaymentApplicationInput[]
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

    const incomingPayments = await prisma.incomingPayment.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        businessPartner: {
          select: {
            name: true,
          },
        },
        bankAccount: {
          select: {
            name: true,
            bankName: true,
          },
        },
        paymentMethod: {
          select: {
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        applications: {
          include: {
            invoice: {
              select: {
                docNum: true,
                totalAmount: true,
              },
            },
          },
        },
      },
      orderBy: [{ paymentDate: "desc" }, { docNum: "desc" }],
    })

    return NextResponse.json(incomingPayments)
  } catch (error) {
    console.error("[INCOMING_PAYMENTS_GET]", error)
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

    const body: IncomingPaymentBodyInput = await req.json()
    const { bpCode, paymentDate, bankAccountId, paymentMethodId, referenceNumber, remarks, applications } = body

    if (!bpCode || !paymentDate || !bankAccountId || !paymentMethodId || !applications || applications.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

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

    // Validate that all invoices exist and belong to the customer
    const invoiceIds = applications.map((app) => app.arInvoiceId)
    const invoices = await prisma.aRInvoice.findMany({
      where: {
        id: { in: invoiceIds },
        bpCode,
        businessUnitId,
      },
    })

    if (invoices.length !== invoiceIds.length) {
      return new NextResponse("One or more invoices not found or don't belong to this customer", { status: 400 })
    }

    // Validate payment amounts don't exceed outstanding balances
    for (const app of applications) {
      const invoice = invoices.find((inv) => inv.id === app.arInvoiceId)
      if (!invoice) continue

      const outstanding =
        Number.parseFloat(invoice.totalAmount.toString()) - Number.parseFloat(invoice.amountPaid.toString())
      const applying = Number.parseFloat(app.amountApplied)

      if (applying > outstanding) {
        return new NextResponse(`Payment amount exceeds outstanding balance for invoice ${invoice.docNum}`, {
          status: 400,
        })
      }
    }

    const numberingSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: "INCOMING_PAYMENT",
      },
    })

    if (!numberingSeries) {
      return new NextResponse("No numbering series found for incoming payments", { status: 400 })
    }

    const docNum = `${numberingSeries.prefix}${numberingSeries.nextNumber.toString().padStart(5, "0")}`
    const totalAmount = applications.reduce((sum, app) => sum + Number.parseFloat(app.amountApplied), 0)

    const incomingPayment = await prisma.$transaction(async (tx) => {
      await tx.numberingSeries.update({
        where: { id: numberingSeries.id },
        data: { nextNumber: numberingSeries.nextNumber + 1 },
      })

      const payment = await tx.incomingPayment.create({
        data: {
          docNum,
          paymentDate: new Date(paymentDate),
          amount: new Prisma.Decimal(totalAmount),
          referenceNumber,
          remarks,
          businessUnit: { connect: { id: businessUnitId } },
          businessPartner: { connect: { bpCode: bpCode } },
          bankAccount: { connect: { id: bankAccountId } },
          paymentMethod: { connect: { id: paymentMethodId } }, // Add this back
          createdBy: { connect: { id: session.user.id } },
          applications: {
            create: applications.map((app: PaymentApplicationInput) => ({
              amountApplied: new Prisma.Decimal(app.amountApplied),
              invoice: { connect: { id: app.arInvoiceId } },
            })),
          },
        },
        include: {
          businessPartner: {
            select: {
              name: true,
            },
          },
          bankAccount: {
            select: {
              name: true,
              bankName: true,
            },
          },
          paymentMethod: {
            select: {
              name: true,
            },
          },
          createdBy: {
            select: {
              name: true,
            },
          },
          applications: {
            include: {
              invoice: {
                select: {
                  docNum: true,
                  totalAmount: true,
                },
              },
            },
          },
        },
      })

      // Update invoice payment amounts and settlement status
      for (const app of applications) {
        const amountApplied = new Prisma.Decimal(app.amountApplied)
        const currentInvoice = await tx.aRInvoice.findUnique({
          where: { id: app.arInvoiceId },
          select: { amountPaid: true, totalAmount: true },
        })

        if (!currentInvoice) continue

        const newAmountPaid =
          Number.parseFloat(currentInvoice.amountPaid.toString()) + Number.parseFloat(app.amountApplied)
        const totalInvoiceAmount = Number.parseFloat(currentInvoice.totalAmount.toString())

        // Determine settlement status using proper enum values
        let settlementStatus: "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" = "OPEN"
        if (newAmountPaid >= totalInvoiceAmount) {
          settlementStatus = "SETTLED"
        } else if (newAmountPaid > 0) {
          settlementStatus = "PARTIALLY_SETTLED"
        }

        await tx.aRInvoice.update({
          where: { id: app.arInvoiceId },
          data: {
            amountPaid: {
              increment: amountApplied,
            },
            settlementStatus: settlementStatus,
          },
        })
      }

      return payment
    })

    return NextResponse.json(incomingPayment, { status: 201 })
  } catch (error) {
    console.error("[INCOMING_PAYMENTS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
