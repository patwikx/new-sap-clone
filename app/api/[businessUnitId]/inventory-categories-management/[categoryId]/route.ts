import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest, { params }: { params: { categoryId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get('x-business-unit-id');
    const { categoryId } = params;

    if (!businessUnitId || !categoryId) {
      return new NextResponse("Business Unit ID and Category ID are required", {
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
    
    // Check if the category exists before attempting to delete
    const existingCategory = await prisma.inventoryCategory.findUnique({
        where: { id: categoryId, businessUnitId: businessUnitId }
    });

    if (!existingCategory) {
        return new NextResponse("Inventory Category not found", { status: 404 });
    }

    // Delete the specified category
    await prisma.inventoryCategory.delete({
      where: {
        id: categoryId,
      },
    })

    return new NextResponse("Inventory category deleted successfully", { status: 200 })
  } catch (error) {
    console.error("[INVENTORY_CATEGORY_DELETE]", error)
    // Handle potential errors, e.g., if the category is in use
    if (error instanceof Error && 'code' in error && (error).code === 'P2003') {
        return new NextResponse("Cannot delete: This category is in use by one or more items.", { status: 409 });
    }
    return new NextResponse("Internal error", { status: 500 })
  }
}
