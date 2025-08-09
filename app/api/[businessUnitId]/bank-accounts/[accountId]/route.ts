import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; accountId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, accountId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { name, bankName, accountNumber, glAccountId, currency, iban, swiftCode, branch } = body

    if (!name || !bankName || !accountNumber || !glAccountId) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if account number is taken by another account
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        accountNumber,
        bankName,
        businessUnitId,
        NOT: { id: accountId }
      }
    })

    if (existingAccount) {
      return new NextResponse("Bank account already exists", { status: 409 })
    }

    const bankAccount = await prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        name,
        bankName,
        accountNumber,
        glAccountId,
        currency,
        iban,
        swiftCode,
        branch
      },
      include: {
        glAccount: {
          select: {
            accountCode: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(bankAccount)
  } catch (error) {
    console.error("[BANK_ACCOUNT_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; accountId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, accountId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await prisma.bankAccount.delete({
      where: { id: accountId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[BANK_ACCOUNT_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}