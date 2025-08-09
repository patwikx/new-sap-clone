import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id")

    // --- DEBUGGING LOGS START ---
    console.log("API GET: Received x-business-unit-id:", businessUnitId)
    console.log("API GET: User session assignments:", JSON.stringify(session.user.assignments, null, 2))
    // --- DEBUGGING LOGS END ---

    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      })
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)

    // --- DEBUGGING LOGS START ---
    console.log("API GET: User has access to unit:", hasAccess, "for businessUnitId:", businessUnitId)
    // --- DEBUGGING LOGS END ---

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        businessUnitId: businessUnitId,
      },
      include: {
        glAccount: {
          select: {
            accountCode: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(bankAccounts)
  } catch (error) {
    console.error("[BANK_ACCOUNTS_GET]", error)
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

    // --- DEBUGGING LOGS START ---
    console.log("API POST: Received x-business-unit-id:", businessUnitId)
    console.log("API POST: User session assignments:", JSON.stringify(session.user.assignments, null, 2))
    // --- DEBUGGING LOGS END ---

    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      })
    }

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId && assignment.role.role === "Admin",
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { name, bankName, accountNumber, glAccountId, currency, iban, swiftCode, branch } = body

    if (!name || !bankName || !accountNumber || !glAccountId) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if account number already exists for this bank
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        accountNumber,
        bankName,
        businessUnitId,
      },
    })

    if (existingAccount) {
      return new NextResponse("Bank account already exists", { status: 409 })
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        name,
        bankName,
        accountNumber,
        glAccountId,
        currency,
        iban,
        swiftCode,
        branch,
        businessUnitId,
      },
      include: {
        glAccount: {
          select: {
            accountCode: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(bankAccount, { status: 201 })
  } catch (error) {
    console.error("[BANK_ACCOUNTS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
