import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; seriesId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, seriesId } = params

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
    const { name, prefix, nextNumber, documentType } = body

    if (!name || !prefix || !nextNumber || !documentType) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if name is taken by another series
    const existingSeries = await prisma.numberingSeries.findFirst({
      where: {
        name,
        businessUnitId,
        NOT: { id: seriesId }
      }
    })

    if (existingSeries) {
      return new NextResponse("Numbering series name already exists", { status: 409 })
    }

    const numberingSeries = await prisma.numberingSeries.update({
      where: { id: seriesId },
      data: {
        name,
        prefix,
        nextNumber: parseInt(nextNumber),
        documentType
      }
    })

    return NextResponse.json(numberingSeries)
  } catch (error) {
    console.error("[NUMBERING_SERIES_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; seriesId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, seriesId } = params

    // Check if user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await prisma.numberingSeries.delete({
      where: { id: seriesId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[NUMBERING_SERIES_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}