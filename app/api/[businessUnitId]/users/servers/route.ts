import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ businessUnitId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { businessUnitId } = await params

    // Get headers for additional context
    const headerBusinessUnitId = req.headers.get("x-business-unit-id")

    // Validate headers match params
    if (headerBusinessUnitId && headerBusinessUnitId !== businessUnitId) {
      return new NextResponse("Business unit ID mismatch", { status: 400 })
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some((assignment) => assignment.businessUnitId === businessUnitId)

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Fetch users who can serve (Cashiers, Servers, Admins) in this business unit
    const servers = await prisma.user.findMany({
      where: {
        assignments: {
          some: {
            businessUnitId: businessUnitId,
            role: {
              role: {
                in: ["Admin", "Cashier", "Server"], // Roles that can take orders
              },
            },
          },
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(servers)
  } catch (error) {
    console.error("[SERVERS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
