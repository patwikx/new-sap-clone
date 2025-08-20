import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

interface PaymentMethodGlMappingInput {
  paymentMethodId: string
  glAccountId: string
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

    const body: PaymentMethodGlMappingInput = await req.json()
    const { paymentMethodId, glAccountId } = body

    if (!paymentMethodId || !glAccountId) {
      return new NextResponse("Payment method ID and GL account ID are required", { status: 400 })
    }

    // Verify payment method exists
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId }
    })

    if (!paymentMethod) {
      return new NextResponse("Payment method not found", { status: 404 })
    }

    // Verify GL account belongs to this business unit
    const glAccount = await prisma.glAccount.findFirst({
      where: {
        id: glAccountId,
        businessUnitId
      }
    })

    if (!glAccount) {
      return new NextResponse("GL account not found or does not belong to this business unit", { status: 404 })
    }

    // Upsert the mapping
    const mapping = await prisma.paymentMethodGlMapping.upsert({
      where: {
        paymentMethodId_businessUnitId: {
          paymentMethodId,
          businessUnitId
        }
      },
      update: {
        glAccountId,
        updatedAt: new Date()
      },
      create: {
        paymentMethodId,
        businessUnitId,
        glAccountId
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

    return NextResponse.json(mapping, { status: 201 })
  } catch (error) {
    console.error("[PAYMENT_METHOD_GL_MAPPINGS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}