import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest, { params }: { params: { taxCodeId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Read businessUnitId from the request headers
    const businessUnitId = req.headers.get('x-business-unit-id');
    // The taxCodeId is available from the route parameters
    const { taxCodeId } = params;

    if (!businessUnitId || !taxCodeId) {
      return new NextResponse("Business Unit ID and Tax Code ID are required", {
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

    // First, check if the tax code exists
    const existingTaxCode = await prisma.taxCode.findUnique({
        where: { id: taxCodeId, businessUnitId: businessUnitId }
    });

    if (!existingTaxCode) {
        return new NextResponse("Tax Code not found", { status: 404 });
    }

    // Delete the specified tax code
    await prisma.taxCode.delete({
      where: {
        id: taxCodeId,
      },
    })

    return new NextResponse("Tax code deleted successfully", { status: 200 })
  } catch (error) {
    console.error("[TAX_CODE_DELETE]", error)
     // Handle cases where the tax code might be in use
    if (error instanceof Error && 'code' in error && (error).code === 'P2003') {
        return new NextResponse("Cannot delete: This tax code is in use.", { status: 409 });
    }
    return new NextResponse("Internal error", { status: 500 })
  }
}
