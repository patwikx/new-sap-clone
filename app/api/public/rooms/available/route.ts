// app/api/rooms/available/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Define the allowed origin for CORS
const allowedOrigin = process.env.NODE_ENV === "production"
  ? "https://your-production-frontend.com" // Replace with your actual frontend URL
  : "http://localhost:3000";

// --- OPTIONS handler for preflight requests ---
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-business-unit-id");
  return response;
}

// --- GET handler to fetch available rooms ---
export async function GET(req: NextRequest) {
  try {
    const businessUnitId = req.headers.get("x-business-unit-id");
    if (!businessUnitId) {
      const response = new NextResponse("Missing x-business-unit-id header", { status: 400 });
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      return response;
    }

    const { searchParams } = new URL(req.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");

    // Base query to find all rooms in the specified business unit
    const whereClause: Prisma.RoomWhereInput = {
      businessUnitId: businessUnitId,
    };

    // If dates are provided, add a filter to exclude rooms with overlapping bookings
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      whereClause.bookings = {
        none: { // The room must have NO bookings that match the following conditions
          booking: {
            status: { in: ["CONFIRMED", "COMPLETED"] },
            // This logic finds any booking that overlaps with the selected date range
            AND: [
              { checkInDate: { lt: checkOutDate } }, // An existing booking starts before the new checkout date
              { checkOutDate: { gt: checkInDate } },  // And it ends after the new check-in date
            ],
          },
        },
      };
    }

    const availableRooms = await prisma.room.findMany({
      where: whereClause,
      select: {
        id: true,
        roomNumber: true,
        status: true,
        accommodation: { // Fetch the related "room type" info
          select: {
            name: true,
            pricePerNight: true,
          },
        },
      },
      orderBy: {
        roomNumber: "asc",
      },
    });

    // Reformat the data to match the frontend's expected "Room" interface
    const formattedRooms = availableRooms.map(room => ({
      id: room.id,
      roomNumber: room.roomNumber,
      status: room.status,
      isAvailable: room.status === 'AVAILABLE', // You can refine this logic
      roomType: {
        name: room.accommodation.name,
        basePrice: room.accommodation.pricePerNight.toNumber(), // Convert Decimal to number
      },
    }));

    // Create the response and add CORS headers
    const response = NextResponse.json(formattedRooms);
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-business-unit-id");
    return response;

  } catch (error) {
    console.error("[AVAILABLE_ROOMS_GET]", error);
    const errorResponse = new NextResponse("Internal error", { status: 500 });
    errorResponse.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    return errorResponse;
  }
}