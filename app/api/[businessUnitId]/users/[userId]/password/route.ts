import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcryptjs from "bcryptjs"

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

    // Check if the acting user has admin access to this business unit
    const hasAdminAccess = session.user.assignments.some(
      (assignment) => 
        assignment.businessUnitId === businessUnitId && 
        assignment.role.role === 'Admin'
    )

    if (!hasAdminAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await req.json()
    const { newPassword } = body

    if (!newPassword || newPassword.length < 6) {
      return new NextResponse("Password must be at least 6 characters", { status: 400 })
    }

    // Hash the new password
    const hashedPassword = await bcryptjs.hash(newPassword, 12)

    // Update the target user's password using the userId from the header
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    return new NextResponse("Password updated successfully", { status: 200 })
  } catch (error) {
    console.error("[USER_PASSWORD_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
