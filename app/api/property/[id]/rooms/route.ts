import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface Room {
  id: string
  name: string
  type: string
  description: string | null
  pricePerNight: number
  capacity: number
  bedrooms: number | null
  bathrooms: number | null
  area: string | null
  imageUrl: string | null
  gallery: string[]
  amenities: string[]
  totalBookings: number
}

interface HotelResponse {
  hotel: {
    id: string
    name: string
    description: string | null
    location: string | null
    address: string | null
  }
  rooms: Room[]
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const businessUnitId = params.id

    const hotel = await prisma.businessUnit.findUnique({
      where: {
        id: businessUnitId,
      },
      include: {
        accommodations: {
          include: {
            _count: {
              select: {
                bookings: true,
              },
            },
          },
        },
      },
    })

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    const response: HotelResponse = {
      hotel: {
        id: hotel.id,
        name: hotel.name,
        description: hotel.description,
        location: hotel.location,
        address: hotel.address,
      },
      rooms: hotel.accommodations.map(
        (room): Room => ({
          id: room.id,
          name: room.name,
          type: room.type,
          description: room.description,
          pricePerNight: Number(room.pricePerNight),
          capacity: room.capacity,
          bedrooms: room.bedrooms,
          bathrooms: room.bathrooms,
          area: room.area,
          imageUrl: room.imageUrl,
          gallery: room.gallery,
          amenities: room.amenities, // This is already a string array in the schema
          totalBookings: room._count.bookings,
        }),
      ),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching property rooms:", error)
    return NextResponse.json({ error: "Failed to fetch property rooms" }, { status: 500 })
  }
}
