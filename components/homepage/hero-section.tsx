"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, MapPin, Star, Users, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Hotel {
  id: string
  name: string
  description: string
  location: string
  address: string
  imageUrl: string
  _count: {
    rooms: number
    guests: number
  }
}

export function HeroSection() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
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

  useEffect(() => {
    if (hotels.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % hotels.length)
      }, 6000)
      return () => clearInterval(timer)
    }
  }, [hotels.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % hotels.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + hotels.length) % hotels.length)
  }

  if (loading) {
    return (
      <section className="relative h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-8"></div>
            <p className="text-xl">Loading our luxury hotels...</p>
          </div>
        </div>
      </section>
    )
  }

  if (!hotels || hotels.length === 0) {
    return (
      <section className="relative h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white max-w-2xl mx-auto px-4">
            <h1 className="text-5xl md:text-7xl font-bold font-serif mb-6">Welcome to Our Hotels</h1>
            <p className="text-xl mb-8">Experience luxury hospitality at its finest</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-screen overflow-hidden">
      {hotels.map((hotel, index) => (
        <div
          key={hotel.id}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105"
            style={{
              backgroundImage: `url(${
                hotel.imageUrl || `/placeholder.svg?height=1080&width=1920&query=luxury hotel ${hotel.name} exterior`
              })`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-cyan-900/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(8,145,178,0.1),transparent_50%)]" />
        </div>
      ))}

      <div className="relative h-full flex items-center justify-center">
        {hotels.map((hotel, index) => (
          <div
            key={hotel.id}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-in-out ${
              index === currentSlide
                ? "opacity-100 transform translate-x-0"
                : index < currentSlide
                  ? "opacity-0 transform -translate-x-16"
                  : "opacity-0 transform translate-x-16"
            }`}
          >
            <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 backdrop-blur-sm rounded-full text-cyan-200 text-sm font-medium border border-cyan-400/30">
                  <Star className="h-4 w-4 fill-current" />
                  Luxury Hotel Experience
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold font-serif mb-6 leading-tight bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">
                {hotel.name}
              </h1>

              <div className="flex items-center justify-center gap-2 mb-6">
                <MapPin className="h-5 w-5 text-cyan-400" />
                <p className="text-xl text-slate-200">{hotel.location}</p>
              </div>

              <p className="text-xl md:text-2xl mb-8 text-slate-200 max-w-3xl mx-auto leading-relaxed font-light">
                {hotel.description || "Experience unparalleled luxury and comfort in the heart of the city"}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Button size="lg" className="btn-enterprise text-white px-8 py-4 text-lg font-semibold rounded-xl">
                  Book Your Stay
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="glass-card text-slate-800 border-white/30 hover:bg-white/20 hover:text-white px-8 py-4 text-lg font-semibold rounded-xl backdrop-blur-sm bg-transparent"
                >
                  Explore Amenities
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="glass-dark rounded-2xl p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Building2 className="h-8 w-8 text-cyan-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{hotel._count.rooms}</div>
                  <div className="text-slate-300 text-sm">Luxury Rooms</div>
                </div>

                <div className="glass-dark rounded-2xl p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Users className="h-8 w-8 text-cyan-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{hotel._count.guests}+</div>
                  <div className="text-slate-300 text-sm">Happy Guests</div>
                </div>

                <div className="glass-dark rounded-2xl p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Star className="h-8 w-8 text-cyan-400 fill-current" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">5.0</div>
                  <div className="text-slate-300 text-sm">Guest Rating</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {hotels.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 backdrop-blur-sm transition-all duration-200 rounded-xl"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 backdrop-blur-sm transition-all duration-200 rounded-xl"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Slide Indicators */}
      {hotels.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {hotels.map((_, index) => (
            <Button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full border-0 ${
                index === currentSlide ? "w-8 h-3 bg-white shadow-lg" : "w-3 h-3 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
