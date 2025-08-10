import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { JournalEntryLine } from "@prisma/client"

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

    const [
      pendingPurchaseRequests,
      pendingJournalEntries,
      allInventoryStocks, // Fetch all first, then filter
      overdueAPInvoices,
      overdueARInvoices
    ] = await Promise.all([
      // Pending Purchase Requests
      prisma.purchaseRequest.findMany({
        where: { 
          businessUnitId,
          status: 'PENDING'
        },
        include: {
          requestor: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Pending Journal Entries
      prisma.journalEntry.findMany({
        where: { 
          businessUnitId,
          approvalWorkflowStatus: 'SUBMITTED' // Corrected status for pending approvals
        },
        include: {
          author: { select: { name: true } },
          lines: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Low Stock Items - Fetch all and filter in code
      prisma.inventoryStock.findMany({
        where: {
          inventoryItem: { businessUnitId },
        },
        include: {
          inventoryItem: { select: { name: true, itemCode: true } },
          location: { select: { name: true } }
        },
      }),

      // Overdue AP Invoices
      prisma.aPInvoice.findMany({
        where: {
          businessUnitId,
          dueDate: { lt: new Date() },
          settlementStatus: { not: 'SETTLED' }
        },
        include: {
          businessPartner: { select: { name: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),

      // Overdue AR Invoices
      prisma.aRInvoice.findMany({
        where: {
          businessUnitId,
          dueDate: { lt: new Date() },
          settlementStatus: { not: 'SETTLED' }
        },
        include: {
          businessPartner: { select: { name: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      })
    ])

    // Filter for low stock items in the application code
    const lowStockItems = allInventoryStocks.filter(stock => 
        Number(stock.quantityOnHand) <= Number(stock.reorderPoint)
    ).slice(0, 10);


    const notifications = [
      // Purchase Request Approvals
      ...pendingPurchaseRequests.map(pr => ({
        id: pr.id,
        type: 'PURCHASE_REQUEST',
        docNum: pr.prNumber,
        title: `Purchase Request ${pr.prNumber}`,
        description: `Pending approval from ${pr.requestor.name}`,
        url: `/${businessUnitId}/purchasing/requests/${pr.id}`,
        date: pr.createdAt.toISOString(),
        priority: 'MEDIUM', // Default priority
        requestor: pr.requestor.name
      })),

      // Journal Entry Approvals
      ...pendingJournalEntries.map(je => ({
        id: je.id,
        type: 'JOURNAL_ENTRY',
        docNum: je.docNum,
        title: `Journal Entry ${je.docNum}`,
        description: `Pending approval from ${je.author.name}`,
        url: `/${businessUnitId}/financials/journal-entries`,
        date: je.createdAt.toISOString(),
        amount: je.lines.reduce((sum: number, line: JournalEntryLine) => 
          sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0),
        requestor: je.author.name,
        priority: 'MEDIUM' // FIX: Added missing priority property
      })),

      // Low Stock Alerts
      ...lowStockItems.map(stock => ({
        id: stock.id,
        type: 'INVENTORY_ALERT',
        docNum: stock.inventoryItem.itemCode || 'N/A',
        title: `Low Stock: ${stock.inventoryItem.name}`,
        description: `Current: ${parseFloat(stock.quantityOnHand.toString())} | Reorder: ${parseFloat(stock.reorderPoint.toString())} | Location: ${stock.location.name}`,
        url: `/${businessUnitId}/inventory/stocks`,
        date: new Date().toISOString(),
        priority: 'HIGH'
      })),

      // Overdue AP Invoices
      ...overdueAPInvoices.map(invoice => ({
        id: invoice.id,
        type: 'AP_INVOICE_OVERDUE',
        docNum: invoice.docNum,
        title: `Overdue AP Invoice ${invoice.docNum}`,
        description: `Payment overdue to ${invoice.businessPartner.name}`,
        url: `/${businessUnitId}/purchasing/invoices`,
        date: invoice.dueDate.toISOString(),
        priority: 'URGENT',
        amount: parseFloat(invoice.totalAmount.toString()) - parseFloat(invoice.amountPaid.toString())
      })),

      // Overdue AR Invoices
      ...overdueARInvoices.map(invoice => ({
        id: invoice.id,
        type: 'AR_INVOICE_OVERDUE',
        docNum: invoice.docNum,
        title: `Overdue AR Invoice ${invoice.docNum}`,
        description: `Payment overdue from ${invoice.businessPartner.name}`,
        url: `/${businessUnitId}/sales/invoices`,
        date: invoice.dueDate.toISOString(),
        priority: 'HIGH',
        amount: parseFloat(invoice.totalAmount.toString()) - parseFloat(invoice.amountPaid.toString())
      }))
    ].sort((a, b) => {
      const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 } as const;
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
