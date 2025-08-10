import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function DELETE(req: NextRequest, { params }: { params: { businessUnitId: string; paymentId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, paymentId } = params

    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Get payment with applications to reverse the amounts
    const existingPayment = await prisma.incomingPayment.findUnique({
      where: { id: paymentId },
      include: {
        applications: true,
      },
    })

    if (!existingPayment) {
      return new NextResponse("Incoming payment not found", { status: 404 })
    }

    // Reverse the payment in a transaction
    await prisma.$transaction(async (tx) => {
      // Reverse the payment amounts on invoices
      for (const app of existingPayment.applications) {
        const invoice = await tx.aRInvoice.findUnique({
          where: { id: app.invoiceId }, // Changed from app.arInvoiceId to app.invoiceId
        })

        if (invoice) {
          const newAmountPaid =
            Number.parseFloat(invoice.amountPaid.toString()) - Number.parseFloat(app.amountApplied.toString())
          const totalAmount = Number.parseFloat(invoice.totalAmount.toString())

          // Determine settlement status using proper enum values
          let settlementStatus: "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" = "OPEN"
          if (newAmountPaid >= totalAmount) {
            settlementStatus = "SETTLED"
          } else if (newAmountPaid > 0) {
            settlementStatus = "PARTIALLY_SETTLED" // Fixed enum value
          }

          await tx.aRInvoice.update({
            where: { id: app.invoiceId }, // Changed from app.arInvoiceId to app.invoiceId
            data: {
              amountPaid: new Prisma.Decimal(newAmountPaid),
              settlementStatus: settlementStatus, // Now properly typed
            },
          })
        }
      }

      // Delete the payment (this will cascade delete the applications)
      await tx.incomingPayment.delete({
        where: { id: paymentId },
      })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[INCOMING_PAYMENT_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
