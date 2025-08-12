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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; configId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, configId } = params

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

    // Check if configuration exists
    const existingConfig = await prisma.posConfiguration.findUnique({
      where: { id: configId }
    })

    if (!existingConfig) {
      return new NextResponse("POS configuration not found", { status: 404 })
    }

    if (existingConfig.businessUnitId !== businessUnitId) {
      return new NextResponse("Configuration does not belong to this business unit", { status: 403 })
    }

    const posConfig = await prisma.posConfiguration.update({
      where: { id: configId },
      data: {
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
        updatedById: session.user.id,
        updatedAt: new Date()
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

    return NextResponse.json(posConfig)
  } catch (error) {
    console.error("[POS_CONFIGURATION_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; configId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, configId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if configuration exists and belongs to this business unit
    const existingConfig = await prisma.posConfiguration.findUnique({
      where: { id: configId }
    })

    if (!existingConfig) {
      return new NextResponse("POS configuration not found", { status: 404 })
    }

    if (existingConfig.businessUnitId !== businessUnitId) {
      return new NextResponse("Configuration does not belong to this business unit", { status: 403 })
    }

    await prisma.posConfiguration.delete({
      where: { id: configId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[POS_CONFIGURATION_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}