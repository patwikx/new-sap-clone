import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessUnitId: string; userId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId, userId } = params

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
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return new NextResponse("Invalid status value", { status: 400 })
    }

    // Prevent self-deactivation
    if (session.user.id === userId && !isActive) {
      return new NextResponse("Cannot deactivate your own account", { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: {
        assignments: {
          include: {
            businessUnit: {
              select: {
                id: true,
                name: true
              }
            },
            role: {
              select: {
                id: true,
                role: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[USER_STATUS_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}