// /api/public/business-units/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Define the allowed origin for CORS
const allowedOrigin = process.env.NODE_ENV === "production" ? "https://your-production-url.com" : "http://localhost:3000"

export async function GET(request: NextRequest) {
  try {
    const businessUnits = await prisma.businessUnit.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    // Create a response with the data and add CORS headers
    const response = NextResponse.json({
      success: true,
      data: businessUnits,
    })

    // Add the CORS headers to the response
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

    return response
  } catch (error) {
    console.error("Error fetching public business units:", error)
    // Also add CORS headers to error responses
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: "Failed to fetch business units",
      },
      { status: 500 },
    )

    errorResponse.headers.set("Access-Control-Allow-Origin", allowedOrigin)
    errorResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

    return errorResponse
  }
}