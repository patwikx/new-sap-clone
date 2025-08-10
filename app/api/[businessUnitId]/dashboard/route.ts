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

    const url = new URL(req.url)
    const timeRange = url.searchParams.get("timeRange") || "30d"
    
    const now = new Date()
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    const [
      customers,
      vendors,
      glAccounts,
      bankAccounts,
      menuItems,
      posTerminals,
      inventoryStocks,
      pendingPurchaseRequests,
      pendingJournalEntries,
      openPurchaseOrders,
      recentJournalEntries,
      recentPurchaseOrders,
      recentAPInvoices
    ] = await Promise.all([
      prisma.businessPartner.count({
        where: { businessUnitId, type: 'CUSTOMER' } // Corrected: 'BOTH' is not a valid type
      }),
      prisma.businessPartner.count({
        where: { businessUnitId, type: 'VENDOR' } // Corrected: 'BOTH' is not a valid type
      }),
      prisma.glAccount.count({ where: { businessUnitId } }),
      prisma.bankAccount.count({ where: { businessUnitId } }),
      prisma.menuItem.count({ where: { businessUnitId } }),
      prisma.posTerminal.count({ where: { businessUnitId } }),
      prisma.inventoryStock.findMany({
        where: {
          inventoryItem: { businessUnitId }
        },
        include: {
          inventoryItem: {
            select: { name: true, standardCost: true }
          },
          location: {
            select: { name: true }
          }
        }
      }),
      prisma.purchaseRequest.count({
        where: { 
          businessUnitId,
          status: 'PENDING'
        }
      }),
      prisma.journalEntry.count({
        where: { 
          businessUnitId,
          approvalWorkflowStatus: 'SUBMITTED' // Corrected: 'PENDING' is not a valid status
        }
      }),
      prisma.purchaseOrder.count({
        where: { businessUnitId, status: 'OPEN' }
      }),
      prisma.journalEntry.findMany({
        where: {
          businessUnitId,
          createdAt: { gte: startDate }
        },
        include: {
          author: { select: { name: true } },
          lines: true // Added missing 'lines' include
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.purchaseOrder.findMany({
        where: {
          businessUnitId,
          createdAt: { gte: startDate }
        },
        include: {
          businessPartner: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      }),
      prisma.aPInvoice.findMany({
        where: {
          businessUnitId,
          createdAt: { gte: startDate }
        },
        include: {
          businessPartner: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 2
      })
    ])

    const totalInventoryValue = inventoryStocks.reduce((sum: number, stock) => {
      const qty = parseFloat(stock.quantityOnHand.toString())
      const cost = stock.inventoryItem.standardCost ? parseFloat(stock.inventoryItem.standardCost) : 0
      return sum + (qty * cost)
    }, 0)

    const lowStockItems = inventoryStocks.filter(stock => {
      const current = parseFloat(stock.quantityOnHand.toString())
      const reorder = parseFloat(stock.reorderPoint.toString())
      return current <= reorder
    }).length

    const inventoryAlerts = inventoryStocks
      .filter(stock => {
        const current = parseFloat(stock.quantityOnHand.toString())
        const reorder = parseFloat(stock.reorderPoint.toString())
        return current <= reorder
      })
      .slice(0, 10)
      .map(stock => ({
        itemName: stock.inventoryItem.name,
        currentStock: parseFloat(stock.quantityOnHand.toString()),
        reorderPoint: parseFloat(stock.reorderPoint.toString()),
        location: stock.location.name
      }))

    const recentTransactions = [
      ...recentJournalEntries.map(je => ({
        id: je.id,
        type: 'JOURNAL_ENTRY',
        docNum: je.docNum,
        amount: je.lines.reduce((sum: number, line: JournalEntryLine) => 
          sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0),
        businessPartner: 'Internal',
        date: je.createdAt.toISOString(),
        status: je.isPosted ? 'POSTED' : je.approvalWorkflowStatus
      })),
      ...recentPurchaseOrders.map(po => ({
        id: po.id,
        type: 'PURCHASE_ORDER',
        docNum: po.poNumber,
        amount: parseFloat(po.totalAmount?.toString() || '0'), // Handle possible null
        businessPartner: po.businessPartner.name,
        date: po.createdAt.toISOString(),
        status: po.status
      })),
      ...recentAPInvoices.map(inv => ({
        id: inv.id,
        type: 'AP_INVOICE',
        docNum: inv.docNum,
        amount: parseFloat(inv.totalAmount.toString()),
        businessPartner: inv.businessPartner.name,
        date: inv.createdAt.toISOString(),
        status: inv.status
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

    const [pendingPRs, pendingJEs] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where: { businessUnitId, status: 'PENDING' },
        include: { requestor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.journalEntry.findMany({
        where: { businessUnitId, approvalWorkflowStatus: 'SUBMITTED' }, // Corrected status
        include: { 
          author: { select: { name: true } },
          lines: true // Added missing 'lines' include
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ])

    const pendingApprovals = [
      ...pendingPRs.map(pr => ({
        id: pr.id,
        type: 'PURCHASE_REQUEST',
        docNum: pr.prNumber,
        amount: 0, // PR doesn't have total amount in schema
        requestor: pr.requestor.name,
        date: pr.createdAt.toISOString(),
        priority: 'MEDIUM' // Default priority since not in schema
      })),
      ...pendingJEs.map(je => ({
        id: je.id,
        type: 'JOURNAL_ENTRY',
        docNum: je.docNum,
        amount: je.lines.reduce((sum: number, line: JournalEntryLine) => 
          sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0),
        requestor: je.author.name,
        date: je.createdAt.toISOString()
      }))
    ].slice(0, 10)

    const topCustomers = await prisma.businessPartner.findMany({
      where: { 
        businessUnitId, 
        type: 'CUSTOMER' // Corrected type
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })

    const totalRevenue = 0
    const totalExpenses = 0
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = 0

    const overdueInvoices = await prisma.aPInvoice.count({
      where: {
        businessUnitId,
        dueDate: { lt: now },
        settlementStatus: { not: 'SETTLED' }
      }
    })

    const dashboardData = {
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        totalCustomers: customers,
        totalVendors: vendors,
        totalInventoryValue,
        lowStockItems,
        pendingPurchaseRequests,
        pendingJournalEntries,
        openPurchaseOrders,
        overdueInvoices
      },
      revenueChart: [],
      recentTransactions,
      pendingApprovals,
      topCustomers: topCustomers.map(customer => ({
        name: customer.name,
        totalSales: 0,
        lastOrder: customer.createdAt.toISOString()
      })),
      inventoryAlerts,
      quickStats: {
        totalGlAccounts: glAccounts,
        totalBankAccounts: bankAccounts,
        totalMenuItems: menuItems,
        activePosTerminals: posTerminals
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("[DASHBOARD_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
