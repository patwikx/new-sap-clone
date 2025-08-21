import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const services = await prisma.hotelService.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        basePrice: true,
        currency: true,
        location: true,
        requiresBooking: true,
        duration: true,
        capacity: true,
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
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })

    // Group services by category
    const groupedServices = services.reduce(
      (acc, service) => {
        if (!acc[service.category]) {
          acc[service.category] = []
        }
        acc[service.category].push(service)
        return acc
      },
      {} as Record<string, typeof services>,
    )

    return NextResponse.json(groupedServices)
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}
