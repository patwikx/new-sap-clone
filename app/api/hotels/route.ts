import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const hotels = await prisma.businessUnit.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        imageUrl: true,
        accommodations: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            shortDescription: true,
            capacity: true,
            bedrooms: true,
            bathrooms: true,
            pricePerNight: true,
            imageUrl: true,
            gallery: true,
            amenities: true,
            isActive: true,
          },
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        hotelServices: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            basePrice: true,
            currency: true,
            isActive: true,
            location: true,
          },
          where: {
            isActive: true,
          },
        },
        _count: {
          select: {
            rooms: true,
            guests: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(hotels)
  } catch (error) {
    console.error("Error fetching hotels:", error)
    return NextResponse.json({ error: "Failed to fetch hotels" }, { status: 500 })
  }
}
