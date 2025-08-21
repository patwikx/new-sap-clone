"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MapPin, Star, Bed, Utensils, Shield } from "lucide-react"

interface Accommodation {
  id: string
  name: string
  type: string
  price?: number
  capacity?: number
}

interface HotelService {
  id: string
  name: string
  category: string
  description?: string
  price?: number
}

interface Hotel {
  id: string
  name: string
  description: string
  location: string
  address: string
  phone: string
  email: string
  website: string
  imageUrl: string
  accommodations: Accommodation[]
  hotelServices: HotelService[]
  _count: {
    rooms: number
    guests: number
  }
}

export function FeaturesSection() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const response = await fetch("/api/hotels")
        if (response.ok) {
          const data = await response.json()
          setHotels(data)
        }
      } catch (error) {
        console.error("Failed to fetch hotels:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHotels()
  }, [])

  if (loading) {
    return (
      <section className="py-24 bg-gradient-to-br from-slate-50 to-cyan-50/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-80 mx-auto mb-6 animate-pulse" />
            <div className="h-6 bg-slate-200 rounded-lg w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!hotels.length) return null

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-cyan-50/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(8,145,178,0.05),transparent_50%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-20">
          <div className="mb-6">
            <Badge variant="outline" className="px-4 py-2 text-cyan-700 border-cyan-200 bg-cyan-50/50">
              Our Hotel Locations
            </Badge>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold font-serif text-slate-900 mb-6 leading-tight">
            Luxury Hotels Across
            <span className="block text-cyan-600">Premium Destinations</span>
          </h2>

          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Experience exceptional hospitality at our {hotels.length} carefully selected locations, each offering unique
            charm and world-class amenities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {hotels.map((hotel, index) => (
            <Card
              key={hotel.id}
              className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:-translate-y-2 animate-fade-in-up overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={
                    hotel.imageUrl || `/placeholder.svg?height=192&width=400&query=luxury hotel ${hotel.name} exterior`
                  }
                  alt={hotel.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 shadow-lg">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    5-Star
                  </Badge>
                </div>
              </div>

              <CardContent className="p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-cyan-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <MapPin className="h-4 w-4 text-cyan-500" />
                        <span className="text-sm">{hotel.location}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-cyan-600">{hotel._count.rooms}</div>
                      <div className="text-xs text-slate-500">Rooms</div>
                    </div>
                  </div>

                  <p className="text-slate-600 leading-relaxed mb-6">
                    {hotel.description || "Experience luxury and comfort in this premium location"}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Bed className="h-4 w-4 text-cyan-500" />
                      <span>{hotel.accommodations.length} Room Types</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="h-4 w-4 text-cyan-500" />
                      <span>{hotel._count.guests}+ Guests</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Utensils className="h-4 w-4 text-cyan-500" />
                      <span>Fine Dining</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Shield className="h-4 w-4 text-cyan-500" />
                      <span>24/7 Service</span>
                    </div>
                  </div>

                  {hotel.hotelServices.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hotel.hotelServices.slice(0, 3).map((service, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs bg-slate-50 text-slate-600 border-slate-200"
                        >
                          {service.category}
                        </Badge>
                      ))}
                      {hotel.hotelServices.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                          +{hotel.hotelServices.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-slate-500 mb-8 font-medium">Recognized by leading hospitality awards</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-2xl font-bold text-slate-400">Forbes Travel</div>
            <div className="text-2xl font-bold text-slate-400">AAA Diamond</div>
            <div className="text-2xl font-bold text-slate-400">Conde Nast</div>
            <div className="text-2xl font-bold text-slate-400">Travel + Leisure</div>
          </div>
        </div>
      </div>
    </section>
  )
}
