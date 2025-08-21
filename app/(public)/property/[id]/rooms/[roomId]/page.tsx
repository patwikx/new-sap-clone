"use client"

import { useState, useEffect, ElementType } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Users, Wifi, Car, Coffee, Dumbbell, MapPin } from "lucide-react"

interface RoomDetail {
  id: string
  name: string
  description: string | null
  price: number
  capacity: number
  amenities: string[]
  images: string[]
  businessUnit: {
    id: string
    name: string
    location: string | null
  }
}

const amenityIcons: { [key: string]: ElementType } = {
  WiFi: Wifi,
  Parking: Car,
  Coffee: Coffee,
  Gym: Dumbbell,
}

export default function RoomDetailPage() {
  const params = useParams()
  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        // Ensure params are valid strings before fetching
        const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;
        const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

        if (!propertyId || !roomId) {
            setLoading(false);
            return;
        }

        const response = await fetch(`/api/property/${propertyId}/rooms/${roomId}`)
        if (response.ok) {
          const data = await response.json()
          setRoom(data)
        }
      } catch (error) {
        console.error("Error fetching room:", error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id && params.roomId) {
      fetchRoom()
    }
  }, [params.id, params.roomId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading room details...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Room Not Found</h1>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }
  
  // Check if room images exist and have content
  const hasImages = room.images && room.images.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/property/${params.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {room.businessUnit.name}
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              {room.businessUnit.location}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={hasImages ? room.images[selectedImage] : "/placeholder.svg?height=400&width=600"}
                alt={room.name}
                width={600}
                height={400}
                className="w-full h-full object-cover"
              />
            </div>
            {hasImages && room.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {room.images.map((image, index) => (
                  <Button // Changed to a button for better accessibility
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${
                      selectedImage === index ? "border-amber-500" : "border-gray-200 hover:border-amber-400"
                    }`}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`${room.name} ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Room Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{room.name}</h1>
              <p className="text-lg text-gray-600">{room.businessUnit.name}</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-700">Up to {room.capacity} guests</span>
                  </div>
      <div className="text-right">
  <div className="text-2xl font-bold text-amber-600">
    {typeof room.price === 'number' 
      ? `₱${room.price.toLocaleString()}` 
      : 'Contact for price'}
  </div>
  {typeof room.price === 'number' && (
    <div className="text-sm text-gray-500">per night</div>
  )}
</div>
                </div>

                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-3">
                  Book This Room
                </Button>
              </CardContent>
            </Card>

            {room.description && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About This Room</h2>
                <p className="text-gray-600 leading-relaxed">{room.description}</p>
              </div>
            )}

            {room.amenities && room.amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map((amenity, index) => {
                    const IconComponent = amenityIcons[amenity]
                    return (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                        {IconComponent && <IconComponent className="h-3 w-3" />}
                        {amenity}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
