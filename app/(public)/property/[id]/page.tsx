"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Users, Bed, Wifi, Car, Coffee, Tv, Bath, Star, ArrowRight } from "lucide-react"
import Link from "next/link"


interface Amenity {
  id: string
  name: string
  category: string
}

interface Room {
  id: string
  name: string
  type: string
  description: string
  price: number
  capacity: number
  size: number
  bedType: string
  amenities: Amenity[]
  totalBookings: number
  imageUrl: string
}

interface Hotel {
  id: string
  name: string
  description: string
  location: string
  address: string
}

interface PropertyData {
  hotel: Hotel
  rooms: Room[]
}

const getAmenityIcon = (category: string) => {
  // Use (category || '') to provide a fallback empty string
  switch ((category || "").toLowerCase()) { 
    case "wifi":
    case "internet":
      return <Wifi className="h-4 w-4" />
    case "parking":
      return <Car className="h-4 w-4" />
    case "coffee":
    case "minibar":
      return <Coffee className="h-4 w-4" />
    case "tv":
    case "entertainment":
      return <Tv className="h-4 w-4" />
    case "bathroom":
    case "bath":
      return <Bath className="h-4 w-4" />
    default:
      return <Star className="h-4 w-4" />
  }
}
export default function PropertyPage() {
  const params = useParams()
  const [data, setData] = useState<PropertyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        const response = await fetch(`/api/property/${params.id}/rooms`)
        if (!response.ok) {
          throw new Error("Failed to fetch property data")
        }
        const propertyData = await response.json()
        setData(propertyData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPropertyData()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen mt-16 bg-gradient-to-br from-slate-50 to-cyan-50/30">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-4"></div>
            <div className="h-12 bg-slate-200 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Property Not Found</h1>
          <p className="text-slate-600 mb-8">{error || "The requested property could not be found."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mt-36 bg-gradient-to-br from-slate-50 to-cyan-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-serif text-slate-900 mb-4">{data.hotel.name}</h1>
              <div className="flex items-center gap-2 text-slate-600 mb-4">
                <MapPin className="h-5 w-5 text-cyan-500" />
                <span className="text-lg">{data.hotel.location}</span>
              </div>
              <p className="text-slate-600 max-w-2xl leading-relaxed">{data.hotel.description}</p>
            </div>
            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 shadow-lg">
              <Star className="h-4 w-4 mr-1 fill-current" />
              5-Star Hotel
            </Badge>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Available Rooms ({data.rooms.length})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.rooms.map((room) => (
              <Card
                key={room.id}
                className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:-translate-y-2 overflow-hidden"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={
                      room.imageUrl ||
                      `/placeholder.svg?height=192&width=400&query=${room.type} hotel room ${room.name}`
                    }
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                      ${room.price}/night
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-slate-900 group-hover:text-cyan-700 transition-colors">
                    {room.name}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit text-xs bg-slate-50 text-slate-600 border-slate-200">
                    {room.type}
                  </Badge>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed">{room.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="h-4 w-4 text-cyan-500" />
                      <span>{room.capacity} Guests</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Bed className="h-4 w-4 text-cyan-500" />
                      <span>{room.bedType}</span>
                    </div>
                  </div>

                  {room.amenities.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-slate-500 mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-2">
                        {room.amenities.slice(0, 4).map((amenity) => (
                          <div key={amenity.id} className="flex items-center gap-1 text-xs text-slate-600">
                            {getAmenityIcon(amenity.category)}
                            <span>{amenity.name}</span>
                          </div>
                        ))}
                        {room.amenities.length > 4 && (
                          <span className="text-xs text-slate-500">+{room.amenities.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  )}

<Link 
  href={`/property/${params.id}/rooms/${room.id}`}
>
  <Button className="w-full btn-enterprise group/button">
    View Room Details
    <ArrowRight className="h-4 w-4 ml-2 group-hover/button:translate-x-1 transition-transform" />
  </Button>
</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {data.rooms.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Rooms Available</h3>
            <p className="text-slate-600">This property currently has no rooms configured.</p>
          </div>
        )}
      </div>
    </div>
  )
}
