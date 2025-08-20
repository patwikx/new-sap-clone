import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { faqId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { faqId } = params
    const body = await req.json()
    const { question, answer, category, isActive, sortOrder } = body

    if (!question || !answer || !category) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const faq = await prisma.fAQ.update({
      where: { id: faqId },
      data: {
        question,
        answer,
        category,
        isActive,
        sortOrder,
        updatedById: session.user.id
      }
    })

    return NextResponse.json(faq)
  } catch (error) {
    console.error("[FAQ_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { faqId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { faqId } = params

    await prisma.fAQ.delete({
      where: { id: faqId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[FAQ_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}