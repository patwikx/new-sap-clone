import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; invoiceId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, invoiceId } = params

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if invoice exists and can be deleted
    const existingInvoice = await prisma.aRInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        applications: true
      }
    })

    if (!existingInvoice) {
      return new NextResponse("AR invoice not found", { status: 404 })
    }

    if (existingInvoice.status === 'CLOSED') {
      return new NextResponse("Cannot delete closed invoice", { status: 400 })
    }

    if (existingInvoice.applications.length > 0) {
      return new NextResponse("Cannot delete invoice with payments applied", { status: 400 })
    }

    await prisma.aRInvoice.delete({
      where: { id: invoiceId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[AR_INVOICE_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}