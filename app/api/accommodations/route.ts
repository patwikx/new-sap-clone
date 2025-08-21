import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const accommodations = await prisma.accommodation.findMany({
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
        businessUnit: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      where: {
        isActive: true,
      },
      orderBy: [{ businessUnit: { name: "asc" } }, { sortOrder: "asc" }],
    })

    return NextResponse.json(accommodations)
  } catch (error) {
    console.error("Error fetching accommodations:", error)
    return NextResponse.json({ error: "Failed to fetch accommodations" }, { status: 500 })
  }
}
