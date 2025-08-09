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

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const glAccounts = await prisma.glAccount.findMany({
      where: {
        businessUnitId: businessUnitId
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
      },
      orderBy: {
        accountCode: 'asc'
      }
    })

    return NextResponse.json(glAccounts)
  } catch (error) {
    console.error("[GL_ACCOUNTS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

    // Check if account code already exists in this business unit
    const existingAccount = await prisma.glAccount.findFirst({
      where: {
        accountCode,
        businessUnitId
      }
    })

    if (existingAccount) {
      return new NextResponse("Account code already exists", { status: 409 })
    }

    const glAccount = await prisma.glAccount.create({
      data: {
        accountCode,
        name,
        accountTypeId,
        normalBalance,
        accountCategoryId,
        accountGroupId,
        description,
        isControlAccount: isControlAccount || false,
        businessUnitId
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

    return NextResponse.json(glAccount, { status: 201 })
  } catch (error) {
    console.error("[GL_ACCOUNTS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}