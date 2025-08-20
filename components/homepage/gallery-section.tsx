"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface GalleryImage {
  id: string
  title: string
  description: string
  imageUrl: string
  category: string
  isActive: boolean
  sortOrder: number
}

export function GallerySection() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await fetch("/api/cms/gallery")
        if (response.ok) {
          const data = await response.json()
          setImages(
            data
              .filter((img: GalleryImage) => img.isActive)
              .sort((a: GalleryImage, b: GalleryImage) => a.sortOrder - b.sortOrder),
          )
        }
      } catch (error) {
        console.error("Failed to fetch gallery:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGallery()
  }, [])

  const categories = ["all", ...Array.from(new Set(images.map((img) => img.category)))]
  const filteredImages = selectedCategory === "all" ? images : images.filter((img) => img.category === selectedCategory)

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredImages.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length)
  }

  if (loading) {
    return (
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-8 bg-slate-200 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-96 mx-auto animate-pulse" />
          </div>
          <div className="h-96 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </section>
    )
  }

  if (images.length === 0) return null

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 font-serif">Gallery</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Discover the beauty and elegance of our spaces
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => {
                  setSelectedCategory(category)
                  setCurrentIndex(0)
                }}
                className="capitalize"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {filteredImages.length > 0 && (
          <div className="relative max-w-4xl mx-auto">
            {/* Main Image */}
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100">
              <Image
                src={filteredImages[currentIndex].imageUrl || "/placeholder.svg"}
                alt={filteredImages[currentIndex].title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
              />

              {/* Navigation Buttons */}
              {filteredImages.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}

              {/* Image Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <div className="text-white">
                  <h3 className="text-xl font-semibold mb-2">{filteredImages[currentIndex].title}</h3>
                  <p className="text-white/90 mb-2">{filteredImages[currentIndex].description}</p>
                  <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                    {filteredImages[currentIndex].category}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Thumbnail Navigation */}
            {filteredImages.length > 1 && (
              <div className="flex justify-center gap-2 mt-6 overflow-x-auto pb-2">
                {filteredImages.map((image, index) => (
                  <Button
                    key={image.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                      index === currentIndex ? "ring-2 ring-amber-500 scale-105" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={image.imageUrl || "/placeholder.svg"}
                      alt={image.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </Button>
                ))}
              </div>
            )}

            {/* Image Counter */}
            {filteredImages.length > 1 && (
              <div className="text-center mt-4 text-slate-600">
                {currentIndex + 1} of {filteredImages.length}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
