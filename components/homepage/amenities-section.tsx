"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Wifi,
  Car,
  Utensils,
  Dumbbell,
  Waves,
  Coffee,
  Shield,
  Users,
  MapPin,
  CheckCircle,
  Plane,
  ShoppingBag,

} from "lucide-react"

interface HotelService {
  id: string
  name: string
  description: string
  category: string
  basePrice: number
  currency: string
  location: string
  requiresBooking: boolean
  duration: number
  capacity: number
  businessUnit: {
    id: string
    name: string
    location: string
  }
}

interface GroupedServices {
  [category: string]: HotelService[]
}

const iconMap = {
  Laundry: ShoppingBag,
  Transportation: Plane,
  Dining: Utensils,
  Fitness: Dumbbell,
  Pool: Waves,
  Business: Users,
  Concierge: Shield,
  WiFi: Wifi,
  Parking: Car,
  Coffee: Coffee,
}

export function AmenitiesSection() {
  const [services, setServices] = useState<GroupedServices>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch("/api/services")
        if (response.ok) {
          const data = await response.json()
          setServices(data)
        }
      } catch (error) {
        console.error("Failed to fetch services:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  if (loading) {
    return (
      <section className="py-24 bg-gradient-to-b from-white via-slate-50 to-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-80 mx-auto mb-6 animate-pulse" />
            <div className="h-6 bg-slate-200 rounded-lg w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const allServices = Object.values(services).flat()
  if (allServices.length === 0) return null

  return (
    <section className="py-24 bg-gradient-to-b from-white via-slate-50 to-slate-100 relative">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width%3D%22100%22 height%3D%22100%22 viewBox%3D%220 0 100 100%22 xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath d%3D%22M50 0L93.3 25v50L50 100L6.7 75V25z%22 fill%3D%22none%22 stroke%3D%22%23e2e8f0%22 strokeWidth%3D%220.5%22 opacity%3D%220.3%22%2F%3E%3C%2Fsvg%3E')] opacity-30"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold font-serif text-slate-900 mb-6 tracking-tight">
            Premium{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">Services</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-8">
            Experience exceptional hospitality with our comprehensive range of luxury services across all our hotel
            locations
          </p>
          <div className="flex items-center justify-center gap-8 text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">24/7 Available</span>
            </div>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="text-sm font-medium">Complimentary Access</div>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="text-sm font-medium">Premium Quality</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allServices.map((service) => {
            const IconComponent = iconMap[service.category as keyof typeof iconMap]

            return (
              <Card
                key={service.id}
                className="group hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-105"
              >
                <CardContent className="p-10 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-full -translate-y-16 translate-x-16 opacity-50 group-hover:opacity-70 transition-opacity"></div>

                  <div className="relative w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-cyan-500/25">
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">
                    {service.name}
                  </h3>

                  <div className="flex items-center justify-center gap-1 mb-4 text-sm text-slate-500">
                    <MapPin className="h-3 w-3" />
                    <span>{service.businessUnit.location}</span>
                  </div>

                  <p className="text-slate-600 mb-6 leading-relaxed text-base">
                    {service.description || `Premium ${service.category.toLowerCase()} service`}
                  </p>

                  <div className="flex items-center justify-between mb-6">
                    <Badge className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-cyan-100 hover:to-blue-100 hover:text-cyan-700 border-0 px-4 py-1 font-medium">
                      {service.category}
                    </Badge>
                    {service.basePrice > 0 && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-cyan-600">
                          {service.currency} {service.basePrice}
                        </div>
                        {service.duration && <div className="text-xs text-slate-500">{service.duration} min</div>}
                      </div>
                    )}
                  </div>

                  {service.requiresBooking && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                      Booking Required
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
