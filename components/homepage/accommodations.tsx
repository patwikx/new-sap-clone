"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Bed, Bath, Star, ArrowRight, MapPin } from "lucide-react"

interface Accommodation {
  id: string
  name: string
  type: string
  description: string
  shortDescription: string
  capacity: number
  bedrooms: number
  bathrooms: number
  area: string
  pricePerNight: number
  imageUrl: string
  gallery: string[]
  amenities: string[]
  businessUnit: {
    id: string
    name: string
    location: string
  }
}

export function AccommodationsSection() {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAccommodations = async () => {
      try {
        const response = await fetch("/api/accommodations")
        if (response.ok) {
          const data = await response.json()
          setAccommodations(data)
        }
      } catch (error) {
        console.error("Failed to fetch accommodations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccommodations()
  }, [])

  if (loading) {
    return (
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-80 mx-auto mb-6 animate-pulse" />
            <div className="h-6 bg-slate-700 rounded-lg w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!accommodations.length) return null

  return (
    <section
      id="accommodations"
      className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold font-serif text-white mb-6 tracking-tight">
            Luxury{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Accommodations
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Discover our exquisite rooms and suites across our 4 premium hotel locations
          </p>
          <div className="flex items-center justify-center gap-8 mt-8 text-slate-400">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium">5-Star Rated</span>
            </div>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="text-sm font-medium">Enterprise Preferred</div>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="text-sm font-medium">24/7 Concierge</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {accommodations.map((accommodation) => (
            <Card
              key={accommodation.id}
              className="group overflow-hidden border-0 bg-white/10 backdrop-blur-md hover:bg-white/15 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20"
            >
              <div className="relative h-72 overflow-hidden">
                <img
                  src={
                    accommodation.imageUrl ||
                    `/placeholder.svg?height=288&width=400&query=luxury hotel room ${accommodation.name || "/placeholder.svg"}`
                  }
                  alt={accommodation.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 shadow-lg">
                    {accommodation.type}
                  </Badge>
                </div>
                <div className="absolute top-4 left-4">
                  <Badge variant="outline" className="bg-black/20 text-white border-white/30 backdrop-blur-sm">
                    <MapPin className="h-3 w-3 mr-1" />
                    {accommodation.businessUnit.location}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {accommodation.name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{accommodation.businessUnit.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                      ${accommodation.pricePerNight}
                    </div>
                    <div className="text-sm text-slate-400">per night</div>
                  </div>
                </div>

                <p className="text-slate-300 mb-6 leading-relaxed">
                  {accommodation.shortDescription || accommodation.description}
                </p>

                <div className="flex items-center gap-6 mb-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-400" />
                    <span>{accommodation.capacity} guests</span>
                  </div>
                  {accommodation.bedrooms && (
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-cyan-400" />
                      <span>{accommodation.bedrooms} bed</span>
                    </div>
                  )}
                  {accommodation.bathrooms && (
                    <div className="flex items-center gap-2">
                      <Bath className="h-4 w-4 text-cyan-400" />
                      <span>{accommodation.bathrooms} bath</span>
                    </div>
                  )}
                </div>

                {accommodation.area && (
                  <div className="mb-4">
                    <Badge variant="outline" className="text-xs bg-slate-800/50 text-slate-300 border-slate-600">
                      {accommodation.area}
                    </Badge>
                  </div>
                )}

                {accommodation.amenities.length > 0 && (
                  <div className="mb-8">
                    <div className="flex flex-wrap gap-2">
                      {accommodation.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-slate-800/50 text-slate-300 border-slate-600 hover:bg-slate-700/50"
                        >
                          {amenity}
                        </Badge>
                      ))}
                      {accommodation.amenities.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-slate-800/50 text-slate-300 border-slate-600">
                          +{accommodation.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 h-12 text-base font-semibold group/btn">
                  Reserve Now
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
