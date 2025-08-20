import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

// Define the allowed origin for CORS. Use an environment variable for production.
const allowedOrigin = process.env.NODE_ENV === "production"
  ? "https://your-production-frontend-url.com" // Replace with your actual frontend URL
  : "http://localhost:3000"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      const response = new NextResponse("Unauthorized", { status: 401 })
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
      return response
    }

    const businessUnitId = req.headers.get("x-business-unit-id")
    if (!businessUnitId) {
      const response = new NextResponse("Missing x-business-unit-id header", {
        status: 400,
      })
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
      return response
    }

    const hasAccess = session.user.assignments.some(
      (assignment) => assignment.businessUnitId === businessUnitId,
    )
    if (!hasAccess) {
      const response = new NextResponse("Forbidden", { status: 403 })
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
      return response
    }

    const { searchParams } = new URL(req.url)
    const checkIn = searchParams.get("checkIn")
    const checkOut = searchParams.get("checkOut")

    const whereClause: Prisma.AccommodationWhereInput = {
      businessUnitId: businessUnitId,
      isActive: true,
    }

    if (checkIn && checkOut) {
      whereClause.NOT = {
        bookings: {
          some: {
            AND: [
              {
                // This logic finds any booking that overlaps with the selected date range
                checkInDate: {
                  lt: new Date(checkOut), // Booking starts before the desired checkout
                },
                checkOutDate: {
                  gt: new Date(checkIn), // Booking ends after the desired check-in
                },
              },
              {
                status: {
                  in: ["CONFIRMED"], // Only consider confirmed bookings as conflicts
                },
              },
            ],
          },
        },
      }
    }

    const availableAccommodations = await prisma.accommodation.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        shortDescription: true,
        capacity: true,
        bedrooms: true,
        bathrooms: true,
        area: true,
        pricePerNight: true,
        imageUrl: true,
        gallery: true,
        amenities: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    const accommodationsWithAvailability = availableAccommodations.map(
      (accommodation) => ({
        ...accommodation,
        isAvailable: true,
      }),
    )
    
    // Create the successful response
    const response = NextResponse.json(accommodationsWithAvailability)
    
    // Add CORS headers to the successful response
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-business-unit-id")

    return response

  } catch (error) {
    console.error("[AVAILABLE_ACCOMMODATIONS_GET]", error)
    
    // Create the error response
    const errorResponse = new NextResponse("Internal error", { status: 500 })
    
    // Add CORS headers to the error response
    errorResponse.headers.set("Access-Control-Allow-Origin", allowedOrigin)
    errorResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, x-business-unit-id")

    return errorResponse
  }
}