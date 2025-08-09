import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcryptjs from "bcryptjs"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get the business unit ID from the request headers
    const businessUnitId = req.headers.get("x-business-unit-id");

    // Add a check to ensure the header was sent
    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      });
    }

    // Check if user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const users = await prisma.user.findMany({
      where: {
        assignments: {
          some: {
            businessUnitId: businessUnitId
          }
        }
      },
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
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("[USERS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get the business unit ID from the request headers
    const businessUnitId = req.headers.get("x-business-unit-id");

    // Add a check to ensure the header was sent
    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      });
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
    const { name, username, password, isActive, assignments } = body

    if (!name || !username || !password || !assignments?.length) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return new NextResponse("Username already exists", { status: 409 }) // 409 Conflict is more appropriate
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12)

    // Create user with assignments
    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        isActive,
        assignments: {
          create: assignments.map((assignment: { businessUnitId: string; roleId: string }) => ({
            businessUnitId: assignment.businessUnitId,
            roleId: assignment.roleId
          }))
        }
      },
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

    return NextResponse.json(user, { status: 201 }) // 201 Created is more appropriate
  } catch (error) {
    console.error("[USERS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
