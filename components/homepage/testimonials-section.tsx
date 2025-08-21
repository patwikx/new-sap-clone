"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Star, Quote, Award, TrendingUp } from "lucide-react"

interface Testimonial {
  id: string
  guestName: string
  guestTitle: string
  content: string
  rating: number
  imageUrl: string
  isActive: boolean
  sortOrder: number
}

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch("/api/cms/testimonials")
        if (response.ok) {
          const data = await response.json()
          setTestimonials(
            data
              .filter((testimonial: Testimonial) => testimonial.isActive)
              .sort((a: Testimonial, b: Testimonial) => a.sortOrder - b.sortOrder),
          )
        }
      } catch (error) {
        console.error("Failed to fetch testimonials:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [])

  if (loading) {
    return (
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-12 bg-slate-700 rounded-lg w-80 mx-auto mb-6 animate-pulse" />
            <div className="h-6 bg-slate-700 rounded-lg w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (testimonials.length === 0) return null

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiPjxwYXRoIGQ9Ik01MCAwTDkzLjMgMjV2NTBMNTAgMTAwTDYuNyA3NVYyNXoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Award className="h-8 w-8 text-amber-400" />
            <h2 className="text-5xl md:text-6xl font-bold font-serif text-white tracking-tight">
              Trusted by{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                Leaders
              </span>
            </h2>
          </div>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Discover why industry executives and discerning travelers choose our premium hospitality services
          </p>
          <div className="flex items-center justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium">4.9/5 Rating</span>
            </div>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium">98% Satisfaction</span>
            </div>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="text-sm font-medium">Fortune 500 Preferred</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="group hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 border-0 bg-white/10 backdrop-blur-md hover:bg-white/15 hover:scale-105"
            >
              <CardContent className="p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 opacity-20">
                  <Quote className="h-12 w-12 text-amber-400" />
                </div>

                <div className="flex items-center gap-1 mb-8 relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 transition-colors ${
                        i < testimonial.rating ? "text-amber-400 fill-amber-400" : "text-slate-600"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-slate-400 font-medium">({testimonial.rating}/5)</span>
                </div>

                <blockquote className="text-slate-300 mb-8 leading-relaxed text-lg italic relative z-10">
                  &quot;{testimonial.content}&quot;
                </blockquote>

                <div className="flex items-center gap-4 relative z-10">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex-shrink-0">
                    {testimonial.imageUrl ? (
                      <Image
                        src={testimonial.imageUrl || "/placeholder.svg"}
                        alt={testimonial.guestName}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white font-bold text-xl">{testimonial.guestName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg group-hover:text-amber-300 transition-colors">
                      {testimonial.guestName}
                    </div>
                    <div className="text-slate-400 text-base font-medium">{testimonial.guestTitle}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
