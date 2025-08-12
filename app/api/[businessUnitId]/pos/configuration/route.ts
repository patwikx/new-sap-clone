import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface PosConfigurationInput {
  autoPostToGl: boolean
  autoCreateArInvoice: boolean
  salesRevenueAccountId?: string
  salesTaxAccountId?: string
  cashAccountId?: string
  discountAccountId?: string
  serviceChargeAccountId?: string
  defaultCustomerBpCode: string
  requireCustomerSelection: boolean
  enableDiscounts: boolean
  enableServiceCharge: boolean
  serviceChargeRate: number
  arInvoiceSeriesId?: string
  journalEntrySeriesId?: string
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

    const posConfig = await prisma.posConfiguration.findUnique({
      where: { businessUnitId },
      include: {
        salesRevenueAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        salesTaxAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        cashAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        discountAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        serviceChargeAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        arInvoiceSeries: {
          select: {
            name: true,
            prefix: true
          }
        },
        journalEntrySeries: {
          select: {
            name: true,
            prefix: true
          }
        }
      }
    })

    if (!posConfig) {
      return new NextResponse("POS configuration not found", { status: 404 })
    }

    return NextResponse.json(posConfig)
  } catch (error) {
    console.error("[POS_CONFIGURATION_GET]", error)
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

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body: PosConfigurationInput = await req.json()

    // Validate required fields
    if (!body.defaultCustomerBpCode) {
      return new NextResponse("Default customer BP code is required", { status: 400 })
    }

    // Check if configuration already exists
    const existingConfig = await prisma.posConfiguration.findUnique({
      where: { businessUnitId }
    })

    if (existingConfig) {
      return new NextResponse("POS configuration already exists. Use PATCH to update.", { status: 409 })
    }

    const posConfig = await prisma.posConfiguration.create({
      data: {
        businessUnitId,
        autoPostToGl: body.autoPostToGl,
        autoCreateArInvoice: body.autoCreateArInvoice,
        salesRevenueAccountId: body.salesRevenueAccountId,
        salesTaxAccountId: body.salesTaxAccountId,
        cashAccountId: body.cashAccountId,
        discountAccountId: body.discountAccountId,
        serviceChargeAccountId: body.serviceChargeAccountId,
        defaultCustomerBpCode: body.defaultCustomerBpCode,
        requireCustomerSelection: body.requireCustomerSelection,
        enableDiscounts: body.enableDiscounts,
        enableServiceCharge: body.enableServiceCharge,
        serviceChargeRate: new Prisma.Decimal(body.serviceChargeRate),
        arInvoiceSeriesId: body.arInvoiceSeriesId,
        journalEntrySeriesId: body.journalEntrySeriesId,
        createdById: session.user.id,
        updatedById: session.user.id
      },
      include: {
        salesRevenueAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        salesTaxAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        cashAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        discountAccount: {
          select: {
            accountCode: true,
            name: true
          }
        },
        serviceChargeAccount: {
          select: {
            accountCode: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(posConfig, { status: 201 })
  } catch (error) {
    console.error("[POS_CONFIGURATION_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}