import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface RoomDetail {
  id: string
  name: string
  description: string | null
  pricePerNight: number
  capacity: number
  amenities: string[]
  imageUrl: string | null
  businessUnit: {
    id: string
    name: string
    location: string | null
  }
}

export async function GET(request: Request, { params }: { params: { id: string; roomId: string } }) {
  try {
    const room = await prisma.accommodation.findFirst({
      where: {
        id: params.roomId,
        businessUnitId: params.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        pricePerNight: true,
        capacity: true,
        amenities: true,
        imageUrl: true,
        businessUnit: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const roomDetail: RoomDetail = {
      ...room,
      pricePerNight: Number(room.pricePerNight),
    }

    return NextResponse.json(roomDetail)
  } catch (error) {
    console.error("Error fetching room details:", error)
    return NextResponse.json({ error: "Failed to fetch room details" }, { status: 500 })
  }
}
