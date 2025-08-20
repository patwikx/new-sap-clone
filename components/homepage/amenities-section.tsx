"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wifi, Car, Utensils, Dumbbell, Waves, Coffee, Shield, Users, Sparkles, MapPin } from "lucide-react"

interface Amenity {
  id: string
  name: string
  description: string
  icon: string
  category: string
  isActive: boolean
  sortOrder: number
}

const iconMap = {
  wifi: Wifi,
  car: Car,
  utensils: Utensils,
  dumbbell: Dumbbell,
  waves: Waves,
  coffee: Coffee,
  shield: Shield,
  users: Users,
  sparkles: Sparkles,
  "map-pin": MapPin,
}

export function AmenitiesSection() {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const response = await fetch("/api/cms/amenities")
        if (response.ok) {
          const data = await response.json()
          setAmenities(
            data
              .filter((amenity: Amenity) => amenity.isActive)
              .sort((a: Amenity, b: Amenity) => a.sortOrder - b.sortOrder),
          )
        }
      } catch (error) {
        console.error("Failed to fetch amenities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAmenities()
  }, [])

  if (loading) {
    return (
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-8 bg-slate-200 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (amenities.length === 0) return null

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 font-serif">Premium Amenities</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Experience luxury and convenience with our carefully curated amenities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {amenities.map((amenity) => {
            const IconComponent = iconMap[amenity.icon as keyof typeof iconMap] || Sparkles

            return (
              <Card
                key={amenity.id}
                className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm"
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{amenity.name}</h3>
                  <p className="text-slate-600 mb-4 leading-relaxed">{amenity.description}</p>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                    {amenity.category}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
