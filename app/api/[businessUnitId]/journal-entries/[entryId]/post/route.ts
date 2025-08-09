import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; entryId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, entryId } = params

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if entry exists and can be posted
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        lines: true
      }
    })

    if (!existingEntry) {
      return new NextResponse("Journal entry not found", { status: 404 })
    }

    if (existingEntry.isPosted) {
      return new NextResponse("Journal entry is already posted", { status: 400 })
    }

    if (existingEntry.approvalWorkflowStatus !== 'APPROVED') {
      return new NextResponse("Journal entry must be approved before posting", { status: 400 })
    }

    // Validate that debits equal credits
    const totalDebits = existingEntry.lines.reduce((sum, line) => 
      sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0)
    const totalCredits = existingEntry.lines.reduce((sum, line) => 
      sum + (line.credit ? parseFloat(line.credit.toString()) : 0), 0)

    if (Math.abs(totalDebits - totalCredits) >= 0.01) {
      return new NextResponse("Journal entry is not balanced", { status: 400 })
    }

    // Post the journal entry
    const journalEntry = await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        isPosted: true,
        postingDate: new Date(),
        postedById: session.user.id
      },
      include: {
        author: {
          select: {
            name: true
          }
        },
        lines: {
          include: {
            glAccount: {
              select: {
                accountCode: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(journalEntry)
  } catch (error) {
    console.error("[JOURNAL_ENTRY_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}