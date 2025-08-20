"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

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
      <section className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-8 bg-slate-200 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (testimonials.length === 0) return null

  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 font-serif">Guest Testimonials</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Hear what our valued guests have to say about their experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white">
              <CardContent className="p-8">
                {/* Rating Stars */}
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < testimonial.rating ? "text-amber-400 fill-amber-400" : "text-slate-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Testimonial Content */}
                <blockquote className="text-slate-700 mb-6 leading-relaxed italic">&quot;{testimonial.content}&quot;</blockquote>

                {/* Guest Info */}
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                    {testimonial.imageUrl ? (
                      <Image
                        src={testimonial.imageUrl || "/placeholder.svg"}
                        alt={testimonial.guestName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                        <span className="text-amber-600 font-semibold text-lg">{testimonial.guestName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.guestName}</div>
                    <div className="text-sm text-slate-600">{testimonial.guestTitle}</div>
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
