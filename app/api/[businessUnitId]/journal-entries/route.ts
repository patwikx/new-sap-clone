import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Define a specific type for the incoming journal entry lines
interface JournalEntryLineInput {
  glAccountId: string;
  description: string;
  debit?: string;
  credit?: string;
}

// Define a type for the entire request body
interface JournalEntryBodyInput {
    documentDate: string;
    postingDate: string;
    referenceNumber?: string;
    memo?: string;
    lines: JournalEntryLineInput[];
}

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

    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        businessUnitId: businessUnitId
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
      },
      orderBy: [
        { postingDate: 'desc' },
        { docNum: 'desc' }
      ]
    })

    // Calculate total amount for each entry
    const entriesWithTotals = journalEntries.map(entry => ({
      ...entry,
      totalAmount: entry.lines.reduce((sum, line) => 
        sum + (line.debit ? parseFloat(line.debit.toString()) : 0), 0)
    }))

    return NextResponse.json(entriesWithTotals)
  } catch (error) {
    console.error("[JOURNAL_ENTRIES_GET]", error)
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

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body: JournalEntryBodyInput = await req.json()
    const { documentDate, postingDate, referenceNumber, memo, lines } = body

    if (!documentDate || !postingDate || !lines || lines.length < 2) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Validate that debits equal credits
    const totalDebits = lines.reduce((sum: number, line: JournalEntryLineInput) => 
      sum + (line.debit ? parseFloat(line.debit) : 0), 0)
    const totalCredits = lines.reduce((sum: number, line: JournalEntryLineInput) => 
      sum + (line.credit ? parseFloat(line.credit) : 0), 0)

    if (Math.abs(totalDebits - totalCredits) >= 0.01) {
      return new NextResponse("Debits must equal credits", { status: 400 })
    }

    // Get next document number
    const numberingSeries = await prisma.numberingSeries.findFirst({
      where: {
        businessUnitId,
        documentType: 'JOURNAL_ENTRY'
      }
    })

    if (!numberingSeries) {
      return new NextResponse("No numbering series found for journal entries", { status: 400 })
    }

    const docNum = `${numberingSeries.prefix}${numberingSeries.nextNumber.toString().padStart(5, '0')}`

    // Get current open accounting period
    const openPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        businessUnitId,
        status: 'OPEN',
        startDate: { lte: new Date(postingDate) },
        endDate: { gte: new Date(postingDate) }
      }
    })

    if (!openPeriod) {
      return new NextResponse("No open accounting period found for the posting date", { status: 400 })
    }

    // Create journal entry with lines
    const journalEntry = await prisma.$transaction(async (tx) => {
      // Update numbering series
      await tx.numberingSeries.update({
        where: { id: numberingSeries.id },
        data: { nextNumber: numberingSeries.nextNumber + 1 }
      })

      // Create journal entry
      const entry = await tx.journalEntry.create({
        data: {
          docNum,
          documentDate: new Date(documentDate),
          postingDate: new Date(postingDate),
          referenceNumber,
          memo,
          businessUnitId,
          authorId: session.user.id,
          accountingPeriodId: openPeriod.id,
          approvalWorkflowStatus: 'DRAFT',
          isPosted: false,
          lines: {
            create: lines.map((line: JournalEntryLineInput) => ({
              description: line.description,
              debit: line.debit ? new Prisma.Decimal(line.debit) : null,
              credit: line.credit ? new Prisma.Decimal(line.credit) : null,
              glAccount: { // Use the relation name 'glAccount'
                connect: { id: line.glAccountId } // And connect it by its ID
              }
            }))
          }
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

      return entry
    })

    return NextResponse.json(journalEntry, { status: 201 })
  } catch (error) {
    console.error("[JOURNAL_ENTRIES_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
