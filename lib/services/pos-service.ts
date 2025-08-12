import { prisma } from "@/lib/prisma"
import { AccountingService } from "./accounting-service"

export class PosService {
  /**
   * Completes an order payment and posts to GL
   * This is the main function to call when settling a POS order
   * 
   * @param orderId - The order ID to complete
   * @param autoPostToGl - Whether to automatically post to GL (default: true)
   * @returns Promise<{ order: Order, accounting?: any }>
   */
  static async completeOrderPayment(orderId: string, autoPostToGl: boolean = true) {
    return await prisma.$transaction(async (tx) => {
      // Get the order
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          payments: true,
          businessPartner: true
        }
      })

      if (!order) {
        throw new Error(`Order ${orderId} not found`)
      }

      if (order.status === 'PAID') {
        throw new Error(`Order ${orderId} is already paid`)
      }

      // Validate payment amount matches order total
      const totalPayments = order.payments.reduce((sum, payment) => 
        sum + Number(payment.amount), 0)

      if (Math.abs(totalPayments - Number(order.totalAmount)) >= 0.01) {
        throw new Error(`Payment amount (${totalPayments}) does not match order total (${Number(order.totalAmount)})`)
      }

      // Ensure walk-in customer exists if no business partner
      if (!order.businessPartner) {
        await AccountingService.ensureWalkInCustomer(order.businessUnitId)
        
        await tx.order.update({
          where: { id: orderId },
          data: { businessPartnerId: 'WALK-IN-CUSTOMER' }
        })
      }

      // Update order status to PAID
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          isPaid: true,
          paidAt: new Date()
        }
      })

      let accountingResult = null

      // Post to GL if requested
      if (autoPostToGl) {
        try {
          accountingResult = await AccountingService.postOrderToGl(orderId)
        } catch (error) {
          console.error('Failed to post order to GL:', error)
          // Don't fail the entire transaction - log the error for manual posting
          // In production, you might want to queue this for retry
        }
      }

      return {
        order: updatedOrder,
        accounting: accountingResult
      }
    })
  }

  /**
   * Validates POS configuration before allowing orders
   * 
   * @param businessUnitId - The business unit to validate
   * @returns Promise<ValidationResult>
   */
  static async validatePosConfiguration(businessUnitId: string) {
    const issues: string[] = []

    // Check GL configuration
    const glValidation = await AccountingService.validatePosGlConfiguration(businessUnitId)
    if (!glValidation.isValid) {
      issues.push(...glValidation.missingAccounts)
    }

    // Check numbering series
    const arSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: 'AR_INVOICE'
      }
    })

    if (!arSeries) {
      issues.push('AR Invoice numbering series not configured')
    }

    const jeSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: 'JOURNAL_ENTRY'
      }
    })

    if (!jeSeries) {
      issues.push('Journal Entry numbering series not configured')
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

    if (!openPeriod) {
      issues.push('No open accounting period found')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  /**
   * Gets accounting status for multiple orders
   * 
   * @param orderIds - Array of order IDs
   * @returns Promise<AccountingStatus[]>
   */
  static async getOrdersAccountingStatus(orderIds: string[]) {
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds }
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        arInvoiceId: true,
        arInvoice: {
          select: {
            id: true,
            docNum: true,
            journalEntryId: true,
            journalEntry: {
              select: {
                id: true,
                docNum: true,
                isPosted: true
              }
            }
          }
        }
      }
    })

    return orders.map(order => ({
      orderId: order.id,
      orderStatus: order.status,
      totalAmount: Number(order.totalAmount),
      isPostedToAr: !!order.arInvoiceId,
      isPostedToGl: !!order.arInvoice?.journalEntryId,
      arInvoiceNumber: order.arInvoice?.docNum,
      journalEntryNumber: order.arInvoice?.journalEntry?.docNum,
      isJournalPosted: order.arInvoice?.journalEntry?.isPosted || false
    }))
  }
}

// Type definitions
export interface ValidationResult {
  isValid: boolean
  issues: string[]
}

export interface AccountingStatus {
  orderId: string
  orderStatus: string
  totalAmount: number
  isPostedToAr: boolean
  isPostedToGl: boolean
  arInvoiceNumber?: string
  journalEntryNumber?: string
  isJournalPosted: boolean
}