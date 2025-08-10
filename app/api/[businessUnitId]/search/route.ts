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
    const query = req.nextUrl.searchParams.get("q")

    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      })
    }

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const searchTerm = query.toLowerCase()

    // Search across multiple document types
    const [
      purchaseRequests,
      purchaseOrders,
      journalEntries,
      apInvoices,
      businessPartners,
      inventoryItems,
      bankAccounts,
      glAccounts,
      goodsReceipts,
      outgoingPayments
    ] = await Promise.all([
      // Purchase Requests
      prisma.purchaseRequest.findMany({
        where: {
          businessUnitId,
          OR: [
            { prNumber: { contains: searchTerm, mode: 'insensitive' } },
            { notes: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: { requestor: { select: { name: true } } },
        take: 5
      }),

      // Purchase Orders
      prisma.purchaseOrder.findMany({
        where: {
          businessUnitId,
          OR: [
            { poNumber: { contains: searchTerm, mode: 'insensitive' } },
            { remarks: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: { businessPartner: { select: { name: true } } },
        take: 5
      }),

      // Journal Entries
      prisma.journalEntry.findMany({
        where: {
          businessUnitId,
          OR: [
            { docNum: { contains: searchTerm, mode: 'insensitive' } },
            { memo: { contains: searchTerm, mode: 'insensitive' } },
            { referenceNumber: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: { author: { select: { name: true } } },
        take: 5
      }),

      // AP Invoices
      prisma.aPInvoice.findMany({
        where: {
          businessUnitId,
          docNum: { contains: searchTerm, mode: 'insensitive' }
        },
        include: { businessPartner: { select: { name: true } } },
        take: 5
      }),

      // Business Partners
      prisma.businessPartner.findMany({
        where: {
          businessUnitId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { bpCode: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        take: 5
      }),

      // Inventory Items
      prisma.inventoryItem.findMany({
        where: {
          businessUnitId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { itemCode: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        take: 5
      }),

      // Bank Accounts
      prisma.bankAccount.findMany({
        where: {
          businessUnitId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { bankName: { contains: searchTerm, mode: 'insensitive' } },
            { accountNumber: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        take: 3
      }),

      // GL Accounts
      prisma.glAccount.findMany({
        where: {
          businessUnitId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { accountCode: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        take: 5
      }),

      // Goods Receipts
      prisma.receiving.findMany({
        where: {
          businessUnitId,
          docNum: { contains: searchTerm, mode: 'insensitive' }
        },
        include: {
          basePurchaseOrder: {
            select: {
              businessPartner: { select: { name: true } }
            }
          }
        },
        take: 3
      }),

      // Outgoing Payments
      prisma.outgoingPayment.findMany({
        where: {
          businessUnitId,
          docNum: { contains: searchTerm, mode: 'insensitive' }
        },
        include: { businessPartner: { select: { name: true } } },
        take: 3
      })
    ])

    // Format search results
    const searchResults = [
      ...purchaseRequests.map(pr => ({
        id: pr.id,
        type: 'PURCHASE_REQUEST',
        docNum: pr.prNumber,
        title: `Purchase Request ${pr.prNumber}`,
        description: `Requested by ${pr.requestor.name}`,
        url: `/${businessUnitId}/purchasing/requests/${pr.id}`,
        date: pr.createdAt.toISOString(),
        status: pr.status
      })),

      ...purchaseOrders.map(po => ({
        id: po.id,
        type: 'PURCHASE_ORDER',
        docNum: po.poNumber,
        title: `Purchase Order ${po.poNumber}`,
        description: `Vendor: ${po.businessPartner.name} | ₱${parseFloat(po.totalAmount?.toString() || '0').toLocaleString()}`,
        url: `/${businessUnitId}/purchasing/orders/${po.id}`,
        date: po.createdAt.toISOString(),
        status: po.status
      })),

      ...journalEntries.map(je => ({
        id: je.id,
        type: 'JOURNAL_ENTRY',
        docNum: je.docNum,
        title: `Journal Entry ${je.docNum}`,
        description: `Created by ${je.author.name}${je.memo ? ` | ${je.memo}` : ''}`,
        url: `/${businessUnitId}/financials/journal-entries`,
        date: je.createdAt.toISOString(),
        status: je.isPosted ? 'POSTED' : je.approvalWorkflowStatus
      })),

      ...apInvoices.map(inv => ({
        id: inv.id,
        type: 'AP_INVOICE',
        docNum: inv.docNum,
        title: `AP Invoice ${inv.docNum}`,
        description: `Vendor: ${inv.businessPartner.name} | ₱${parseFloat(inv.totalAmount.toString()).toLocaleString()}`,
        url: `/${businessUnitId}/purchasing/invoices`,
        date: inv.createdAt.toISOString(),
        status: inv.status
      })),

      ...businessPartners.map(bp => ({
        id: bp.id,
        type: 'BUSINESS_PARTNER',
        docNum: bp.bpCode,
        title: bp.name,
        description: `${bp.type} | Code: ${bp.bpCode}${bp.email ? ` | ${bp.email}` : ''}`,
        url: `/${businessUnitId}/business-partners`,
        date: bp.createdAt.toISOString()
      })),

      ...inventoryItems.map(item => ({
        id: item.id,
        type: 'INVENTORY_ITEM',
        docNum: item.itemCode || 'N/A',
        title: item.name,
        description: `Code: ${item.itemCode || 'N/A'}${item.description ? ` | ${item.description}` : ''}`,
        url: `/${businessUnitId}/inventory/items`,
        date: item.createdAt.toISOString()
      })),

      ...bankAccounts.map(bank => ({
        id: bank.id,
        type: 'BANK_ACCOUNT',
        docNum: bank.accountNumber,
        title: bank.name,
        description: `${bank.bankName} | Account: ${bank.accountNumber}`,
        url: `/${businessUnitId}/financials/banks`,
        date: bank.createdAt.toISOString()
      })),

      ...glAccounts.map(acc => ({
        id: acc.id,
        type: 'GL_ACCOUNT',
        docNum: acc.accountCode,
        title: `${acc.accountCode} - ${acc.name}`,
        description: `${acc.normalBalance} balance account`,
        url: `/${businessUnitId}/financials/chart-of-accounts`,
        date: acc.createdAt.toISOString()
      })),

      ...goodsReceipts.map(gr => ({
        id: gr.id,
        type: 'GOODS_RECEIPT',
        docNum: gr.docNum,
        title: `Goods Receipt ${gr.docNum}`,
        description: `From: ${gr.basePurchaseOrder?.businessPartner?.name || 'Unknown'}`,
        url: `/${businessUnitId}/purchasing/receiving/${gr.id}`,
        date: gr.createdAt.toISOString()
      })),

      ...outgoingPayments.map(payment => ({
        id: payment.id,
        type: 'OUTGOING_PAYMENT',
        docNum: payment.docNum,
        title: `Payment ${payment.docNum}`,
        description: `To: ${payment.businessPartner.name} | ₱${parseFloat(payment.amount.toString()).toLocaleString()}`,
        url: `/${businessUnitId}/purchasing/payments`,
        date: payment.createdAt.toISOString()
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(searchResults.slice(0, 20))
  } catch (error) {
    console.error("[SEARCH_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
