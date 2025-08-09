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
    const { accountCode, name, accountTypeId, normalBalance, accountCategoryId, accountGroupId, description, isControlAccount } = body

    if (!accountCode || !name || !accountTypeId || !normalBalance) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if account code is taken by another account
    const existingAccount = await prisma.glAccount.findFirst({
      where: {
        accountCode,
        businessUnitId,
        NOT: { id: accountId }
      }
    })

    if (existingAccount) {
      return new NextResponse("Account code already exists", { status: 409 })
    }

    const glAccount = await prisma.glAccount.update({
      where: { id: accountId },
      data: {
        accountCode,
        name,
        accountTypeId,
        normalBalance,
        accountCategoryId: accountCategoryId || null,
        accountGroupId: accountGroupId || null,
        description: description || null,
        isControlAccount: isControlAccount || false
      },
      include: {
        accountType: {
          select: {
            name: true
          }
        },
        accountCategory: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(glAccount)
  } catch (error) {
    console.error("[GL_ACCOUNT_PATCH]", error)
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

    // Check if account is being used in any transactions
    const [bankAccounts, journalLines] = await Promise.all([
      prisma.bankAccount.findFirst({ where: { glAccountId: accountId } }),
      // Corrected the query to filter through the relation
      prisma.journalEntryLine.findFirst({ where: { glAccount: { id: accountId } } })
    ])

    if (bankAccounts || journalLines) {
      return new NextResponse("Cannot delete account that is being used in transactions", { status: 400 })
    }

    await prisma.glAccount.delete({
      where: { id: accountId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[GL_ACCOUNT_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
