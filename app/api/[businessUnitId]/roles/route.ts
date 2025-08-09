import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
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
    );

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const roles = await prisma.roles.findMany({
      orderBy: {
        role: 'asc'
      }
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("[ROLES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}