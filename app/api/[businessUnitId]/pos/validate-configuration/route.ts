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

    // Check authorization
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    const isAuthorized = session.user.role?.role === "Admin"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Validate POS configuration
    const validation = await validatePosConfiguration(businessUnitId)

    return NextResponse.json({
      isValid: validation.isValid,
      issues: validation.issues,
      warnings: validation.warnings || [],
      message: validation.isValid
        ? "POS configuration is valid"
        : "POS configuration has issues that need to be resolved"
    })
  } catch (error) {
    console.error("[POS_VALIDATE_CONFIGURATION]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

async function validatePosConfiguration(businessUnitId: string) {
  const issues: string[] = []
  const warnings: string[] = []

  // Check if POS configuration exists
  const posConfig = await prisma.posConfiguration.findUnique({
    where: { businessUnitId },
    include: {
      salesRevenueAccount: true,
      salesTaxAccount: true,
      cashAccount: true,
      discountAccount: true,
      arInvoiceSeries: true,
      journalEntrySeries: true
    }
  })

  if (!posConfig) {
    issues.push("POS configuration not found. Please create a configuration first.")
    return { isValid: false, issues, warnings }
  }

  // Check required GL accounts if auto-posting is enabled
  if (posConfig.autoPostToGl) {
    if (!posConfig.salesRevenueAccountId) {
      issues.push("Sales revenue account is required for auto-posting")
    }
    if (!posConfig.salesTaxAccountId) {
      issues.push("Sales tax account is required for auto-posting")
    }
    if (!posConfig.cashAccountId) {
      warnings.push("Default cash account not set - will use payment method mappings")
    }
  }

  // Check numbering series if auto-creating documents
  if (posConfig.autoCreateArInvoice && !posConfig.arInvoiceSeriesId) {
    issues.push("AR Invoice numbering series is required for auto-creating invoices")
  }

  if (posConfig.autoPostToGl && !posConfig.journalEntrySeriesId) {
    issues.push("Journal Entry numbering series is required for auto-posting")
  }

  // Check menu item mappings
  const menuItemsWithoutMapping = await prisma.menuItem.count({
    where: {
      businessUnitId,
      isActive: true,
      glMapping: null
    }
  })

  if (menuItemsWithoutMapping > 0) {
    if (posConfig.autoPostToGl && !posConfig.salesRevenueAccountId) {
        issues.push(`${menuItemsWithoutMapping} menu items are missing GL account mappings and no default is set.`);
    } else {
        warnings.push(`${menuItemsWithoutMapping} menu items are missing GL account mappings (will use default sales account).`);
    }
  }

  // Check payment method mappings
  const paymentMethodsWithoutMapping = await prisma.paymentMethod.count({
    where: {
      isActive: true,
      glMappings: {
        none: {
          businessUnitId
        }
      }
    }
  })

  if (paymentMethodsWithoutMapping > 0) {
    if (posConfig.autoPostToGl && !posConfig.cashAccountId) {
        issues.push(`${paymentMethodsWithoutMapping} payment methods are missing GL account mappings and no default is set.`);
    } else {
        warnings.push(`${paymentMethodsWithoutMapping} payment methods are missing GL account mappings (will use default cash account).`);
    }
  }

  // Check accounting period
  const openPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      businessUnitId,
      status: 'OPEN',
      startDate: { lte: new Date() },
      endDate: { gte: new Date() }
    }
  })

  if (!openPeriod && posConfig.autoPostToGl) {
    issues.push("No open accounting period found for current date")
  }

  // Check default customer
  if (posConfig.defaultCustomerBpCode) {
    const defaultCustomer = await prisma.businessPartner.findFirst({
        where: {
            bpCode: posConfig.defaultCustomerBpCode,
            businessUnitId,
            type: 'CUSTOMER'
        }
    });
    if (!defaultCustomer) {
        issues.push(`Default customer '${posConfig.defaultCustomerBpCode}' not found`);
    }
  } else {
      issues.push("Default customer BpCode is not set in the POS configuration");
  }


  return {
    isValid: issues.length === 0,
    issues,
    warnings
  }
}
