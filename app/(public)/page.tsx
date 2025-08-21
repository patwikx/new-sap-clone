import { HeroSection } from "@/components/homepage/hero-section"
import { FeaturesSection } from "@/components/homepage/features-section"
import { AccommodationsSection } from "@/components/homepage/accommodations"
import { AmenitiesSection } from "@/components/homepage/amenities-section"
import { GallerySection } from "@/components/homepage/gallery-section"
import { TestimonialsSection } from "@/components/homepage/testimonials-section"
import { FAQSection } from "@/components/homepage/faq-section"
import { ContactSection } from "@/components/homepage/contact-section"


async function getHomepageData() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/cms/homepage`, {
      cache: "no-store", // Always fetch fresh data for homepage
    })

    if (!response.ok) {
      throw new Error("Failed to fetch homepage data")
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching homepage data:", error)
    return null
  }
}

export default async function HomePage() {
  const data = await getHomepageData()

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Welcome to Our Hotel</h1>
          <p className="text-muted-foreground">Loading content...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      {data.heroSections?.length > 0 && <HeroSection />}


           {/* Features Section */}
      {data.features?.length > 0 && <FeaturesSection />}

      {/* Amenities Section */}
      <AmenitiesSection />

      {/* Gallery Section */}
      <GallerySection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Contact Section */}
      <ContactSection />
    
    </main>
  )
}
