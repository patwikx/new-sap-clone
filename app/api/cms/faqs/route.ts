import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET handler for fetching public FAQs.
 * This is a public route and does not require authentication.
 * It supports filtering by a 'category' query parameter.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get("category")

    const whereClause: Prisma.FAQWhereInput = {
      isActive: true,
    }

    if (category) {
      whereClause.category = category
    }

    const faqs = await prisma.fAQ.findMany({
      where: whereClause,
      orderBy: {
        sortOrder: 'asc'
      }
    })

    return NextResponse.json(faqs)
  } catch (error) {
    console.error("[FAQS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

/**
 * POST handler for creating a new FAQ.
 * Requires authentication and a global 'Admin' role.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const hasAdminAccess = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden: Admin role required", { status: 403 })
    }

    const body = await req.json()
    const { question, answer, category, isActive, sortOrder } = body

    if (!question || !answer || !category) {
      return new NextResponse("Missing required fields: question, answer, and category", { status: 400 })
    }

    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        category,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 1,
        createdById: session.user.id,
        updatedById: session.user.id
      }
    })

    return NextResponse.json(faq, { status: 201 })
  } catch (error) {
    console.error("[FAQS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
