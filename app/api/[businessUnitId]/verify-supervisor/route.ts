import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const businessUnitId = req.headers.get('x-business-unit-id');
    const body = await req.json();
    const { username, password } = body;

    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", { status: 400 });
    }

    if (!username || !password) {
      return new NextResponse("Missing username or password", { status: 400 });
    }

    const supervisor = await prisma.user.findUnique({
      where: { username },
      include: {
        assignments: {
          where: {
            businessUnitId: businessUnitId,
          },
          include: {
            role: true,
          },
        },
      },
    });

    if (!supervisor || !supervisor.password) {
      return new NextResponse("Invalid username or password", { status: 401 });
    }

    const isPasswordCorrect = await bcrypt.compare(password, supervisor.password);
    if (!isPasswordCorrect) {
      return new NextResponse("Invalid username or password", { status: 401 });
    }

    const assignment = supervisor.assignments[0];
    if (!assignment || !assignment.role) {
      return new NextResponse("User does not have an assigned role in this business unit", { status: 403 });
    }
    
    const roleName = assignment.role.role;

    // --- MODIFIED LOGIC ---
    // Check if the user's role is in the list of authorized roles.
    const authorizedRoles = ['Admin', 'Manager', 'Supervisor'];
    const isAuthorized = authorizedRoles.includes(roleName);

    if (!isAuthorized) {
      return new NextResponse("Access denied. Admin, Supervisor, or Manager role required.", { status: 403 });
    }

    return NextResponse.json({ success: true, message: "Verification successful." });

  } catch (error) {
    console.error("[VERIFY_SUPERVISOR_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}