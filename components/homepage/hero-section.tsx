"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button" // Assuming this path is correct

interface HeroSection {
  id: string
  title: string
  subtitle: string
  backgroundImageUrl: string
  ctaText: string
  ctaLink: string
  isActive: boolean
  sortOrder: number
}

interface HeroSectionProps {
  heroSections: HeroSection[]
}

export function HeroSection({ heroSections }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    if (heroSections.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSections.length)
      }, 6000) // Increased interval to match example
      return () => clearInterval(timer)
    }
  }, [heroSections.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSections.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSections.length) % heroSections.length)
  }

  if (!heroSections || heroSections.length === 0) return null

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Images with Gentle Crossfade */}
      {heroSections.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105"
            style={{ backgroundImage: `url(${slide.backgroundImageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/40" />
        </div>
      ))}

      {/* Content - All Text Moves Together */}
      <div className="relative h-full flex items-center justify-center">
        {heroSections.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-in-out ${
              index === currentSlide
                ? "opacity-100 transform translate-x-0"
                : index < currentSlide
                ? "opacity-0 transform -translate-x-16"
                : "opacity-0 transform translate-x-16"
            }`}
          >
            <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
              <h1 className="text-5xl md:text-7xl font-bold font-serif mb-6 leading-tight">{slide.title}</h1>
              <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
                {slide.subtitle}
              </p>
              {/* You can link this button using Next.js Link component if needed */}
              <a href={slide.ctaLink}>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-white px-8 py-3 text-lg font-semibold">
                  {slide.ctaText}
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {heroSections.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 backdrop-blur-sm transition-all duration-200"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 backdrop-blur-sm transition-all duration-200"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Slide Indicators */}
      {heroSections.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {heroSections.map((_, index) => (
            <Button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide 
                  ? "w-8 h-3 bg-white shadow-lg" 
                  : "w-3 h-3 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
