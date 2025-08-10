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

    // Get all AR invoices that are not fully paid
    const arInvoices = await prisma.aRInvoice.findMany({
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
    interface CustomerAging {
      bpCode: string
      customerName: string
      current: number
      days1to30: number
      days31to60: number
      days61to90: number
      over90: number
      totalBalance: number
      oldestInvoiceDate?: string
    }

    const customerAging = new Map<string, CustomerAging>()

    arInvoices.forEach(invoice => {
      const customerId = invoice.businessPartner.bpCode
      const outstandingAmount = parseFloat(invoice.totalAmount.toString()) - parseFloat(invoice.amountPaid.toString())
      
      if (outstandingAmount <= 0) return

      const daysDiff = Math.floor((asOfDateTime.getTime() - new Date(invoice.postingDate).getTime()) / (1000 * 60 * 60 * 24))
      
      if (!customerAging.has(customerId)) {
        customerAging.set(customerId, {
          bpCode: invoice.businessPartner.bpCode,
          customerName: invoice.businessPartner.name,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
          totalBalance: 0,
          oldestInvoiceDate: invoice.postingDate.toISOString()
        })
      }

      const customer = customerAging.get(customerId)!
      
      if (new Date(invoice.postingDate) < new Date(customer.oldestInvoiceDate!)) {
        customer.oldestInvoiceDate = invoice.postingDate.toISOString()
      }

      if (daysDiff <= 0) {
        customer.current += outstandingAmount
      } else if (daysDiff <= 30) {
        customer.days1to30 += outstandingAmount
      } else if (daysDiff <= 60) {
        customer.days31to60 += outstandingAmount
      } else if (daysDiff <= 90) {
        customer.days61to90 += outstandingAmount
      } else {
        customer.over90 += outstandingAmount
      }

      customer.totalBalance += outstandingAmount
    })

    const customers = Array.from(customerAging.values())
    
    // Calculate summary with explicit types
    const summary = {
      current: customers.reduce((sum: number, c) => sum + c.current, 0),
      days1to30: customers.reduce((sum: number, c) => sum + c.days1to30, 0),
      days31to60: customers.reduce((sum: number, c) => sum + c.days31to60, 0),
      days61to90: customers.reduce((sum: number, c) => sum + c.days61to90, 0),
      over90: customers.reduce((sum: number, c) => sum + c.over90, 0),
      totalReceivables: customers.reduce((sum: number, c) => sum + c.totalBalance, 0)
    }

    const arAgingData = {
      asOfDate,
      customers: customers.sort((a, b) => b.totalBalance - a.totalBalance),
      summary
    }

    return NextResponse.json(arAgingData)
  } catch (error) {
    console.error("[AR_AGING_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
