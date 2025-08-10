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

    const url = new URL(req.url)
    const asOfDate = url.searchParams.get("endDate") || new Date().toISOString().split('T')[0]
    const asOfDateTime = new Date(asOfDate)

    // Get all AP invoices that are not fully paid
    const apInvoices = await prisma.aPInvoice.findMany({
      where: {
        businessUnitId: businessUnitId,
        postingDate: { lte: asOfDateTime },
        // Corrected enum value from 'CLOSED' to 'SETTLED' to match schema
        settlementStatus: { not: 'SETTLED' }
      },
      include: {
        businessPartner: {
          select: {
            bpCode: true,
            name: true
          }
        }
      },
      orderBy: {
        postingDate: 'asc'
      }
    })

    // Define the structure for the aging map
    interface VendorAging {
      bpCode: string
      vendorName: string
      current: number
      days1to30: number
      days31to60: number
      days61to90: number
      over90: number
      totalBalance: number
      oldestInvoiceDate?: string
    }

    const vendorAging = new Map<string, VendorAging>()

    apInvoices.forEach(invoice => {
      const vendorId = invoice.businessPartner.bpCode
      const outstandingAmount = parseFloat(invoice.totalAmount.toString()) - parseFloat(invoice.amountPaid.toString())
      
      if (outstandingAmount <= 0) return

      const daysDiff = Math.floor((asOfDateTime.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      
      if (!vendorAging.has(vendorId)) {
        vendorAging.set(vendorId, {
          bpCode: invoice.businessPartner.bpCode,
          vendorName: invoice.businessPartner.name,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
          totalBalance: 0,
          oldestInvoiceDate: invoice.postingDate.toISOString()
        })
      }

      const vendor = vendorAging.get(vendorId)!
      
      if (new Date(invoice.postingDate) < new Date(vendor.oldestInvoiceDate!)) {
        vendor.oldestInvoiceDate = invoice.postingDate.toISOString()
      }

      // Categorize by aging (based on due date)
      if (daysDiff <= 0) {
        vendor.current += outstandingAmount
      } else if (daysDiff <= 30) {
        vendor.days1to30 += outstandingAmount
      } else if (daysDiff <= 60) {
        vendor.days31to60 += outstandingAmount
      } else if (daysDiff <= 90) {
        vendor.days61to90 += outstandingAmount
      } else {
        vendor.over90 += outstandingAmount
      }

      vendor.totalBalance += outstandingAmount
    })

    const vendors = Array.from(vendorAging.values())
    
    // Calculate summary
    const summary = {
      current: vendors.reduce((sum, v) => sum + v.current, 0),
      days1to30: vendors.reduce((sum, v) => sum + v.days1to30, 0),
      days31to60: vendors.reduce((sum, v) => sum + v.days31to60, 0),
      days61to90: vendors.reduce((sum, v) => sum + v.days61to90, 0),
      over90: vendors.reduce((sum, v) => sum + v.over90, 0),
      totalPayables: vendors.reduce((sum, v) => sum + v.totalBalance, 0)
    }

    const apAgingData = {
      asOfDate,
      vendors: vendors.sort((a, b) => b.totalBalance - a.totalBalance),
      summary
    }

    return NextResponse.json(apAgingData)
  } catch (error) {
    console.error("[AP_AGING_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
