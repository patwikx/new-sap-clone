import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Add this line to force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest
  // We no longer need params here as both IDs will come from headers
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get both IDs from the request headers to avoid using params
    const businessUnitId = req.headers.get("x-business-unit-id");
    const userId = req.headers.get("x-user-id");

    if (!businessUnitId || !userId) {
        return new NextResponse("Missing required headers: x-business-unit-id or x-user-id", { status: 400 });
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
    const { name, username, isActive, assignments } = body

    if (!name || !username) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if username is taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId }
      }
    })

    if (existingUser) {
      return new NextResponse("Username already exists", { status: 409 }) // 409 Conflict
    }

    // Update user and assignments in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Update user basic info
      await tx.user.update({
        where: { id: userId },
        data: {
          name,
          username,
          isActive
        }
      })

      // Delete existing assignments for this user
      await tx.userBusinessUnit.deleteMany({
        where: { userId }
      })

      // Create new assignments if provided
      if (assignments?.length) {
        await tx.userBusinessUnit.createMany({
          data: assignments.map((assignment: { businessUnitId: string; roleId: string }) => ({
            userId,
            businessUnitId: assignment.businessUnitId,
            roleId: assignment.roleId
          }))
        })
      }

      // Return the fully updated user with new assignments
      return await tx.user.findUnique({
        where: { id: userId },
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
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[USER_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest
  // We no longer need params here
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get both IDs from the request headers
    const businessUnitId = req.headers.get("x-business-unit-id");
    const userId = req.headers.get("x-user-id");

    if (!businessUnitId || !userId) {
        return new NextResponse("Missing required headers: x-business-unit-id or x-user-id", { status: 400 });
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

    // Prevent self-deletion
    if (session.user.id === userId) {
      return new NextResponse("Cannot delete your own account", { status: 403 }) // 403 Forbidden is more appropriate
    }

    // Delete user (assignments will be deleted due to cascade if set up in schema)
    await prisma.user.delete({
      where: { id: userId }
    })

    return new NextResponse(null, { status: 204 }) // 204 No Content
  } catch (error) {
    console.error("[USER_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
