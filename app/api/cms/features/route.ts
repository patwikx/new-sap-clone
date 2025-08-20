import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    // No longer needs session or business unit checks for public data
    const features = await prisma.feature.findMany({
      where: {
        isActive: true, // Fetch only active features for the public site
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    return NextResponse.json(features);
  } catch (error) {
    console.error("[FEATURES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if the user has an 'Admin' role in any of their assignments
    const isGlobalAdmin = session.user.assignments.some(
      (assignment) => assignment.role.role === 'Admin'
    );

    if (!isGlobalAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { title, description, iconName, isActive, sortOrder } = body;

    if (!title || !description || !iconName) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const feature = await prisma.feature.create({
      data: {
        title,
        description,
        iconName,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 1,
        // businessUnitId is removed
        createdById: session.user.id,
        updatedById: session.user.id
      }
    });

    return NextResponse.json(feature, { status: 201 });
  } catch (error) {
    console.error("[FEATURES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}