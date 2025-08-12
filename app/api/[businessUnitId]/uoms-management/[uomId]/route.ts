import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest, { params }: { params: { uomId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Read businessUnitId from the request headers
    const businessUnitId = req.headers.get('x-business-unit-id');
    // The uomId is available from the route parameters
    const { uomId } = params

    if (!businessUnitId || !uomId) {
      return new NextResponse("Business Unit ID and UoM ID are required", {
        status: 400,
      })
    }

    // Verify user has access to this business unit
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Delete the specified UoM
    await prisma.uoM.delete({
      where: {
        id: uomId,
      },
    })

    return new NextResponse("UoM deleted successfully", { status: 200 })
  } catch (error) {
    console.error("[UOM_DELETE]", error)
    // Handle potential errors, e.g., if the UoM is still in use
    if (error instanceof Error && 'code' in error && (error).code === 'P2003') {
        return new NextResponse("Cannot delete: This UoM is currently in use by one or more items.", { status: 409 });
    }
    return new NextResponse("Internal error", { status: 500 })
  }
}
