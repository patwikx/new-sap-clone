import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { PosService } from "@/lib/services/pos-service"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const businessUnitId = req.headers.get("x-business-unit-id")

    if (!businessUnitId) {
      return new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      })
    }

    // Check authorization
    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId
    )

    const isAuthorized = session.user.role?.role === "Admin"

    if (!hasAccess || !isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Validate POS configuration
    const validation = await PosService.validatePosConfiguration(businessUnitId)

    return NextResponse.json({
      isValid: validation.isValid,
      issues: validation.issues,
      message: validation.isValid 
        ? "POS configuration is valid" 
        : "POS configuration has issues that need to be resolved"
    })
  } catch (error) {
    console.error("[POS_VALIDATE_CONFIGURATION]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}