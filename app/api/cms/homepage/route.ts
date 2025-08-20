// Public API for hotel website homepage content
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Define the allowed origin for CORS. Adjust the production URL as needed.
const allowedOrigin = process.env.NODE_ENV === "production" 
  ? "https://your-hotel-website.com" 
  : "http://localhost:3000"

// OPTIONS handler for preflight requests
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  return response
}

/**
 * GET handler for fetching all public content for the homepage.
 * This route is now global and does not depend on businessUnitId.
 */
export async function GET(req: NextRequest) {
  try {
    // Fetch all homepage content in parallel
    const [
      heroSections,
      features,
      testimonials,
      galleryImages,
      amenities,
      contactInfo,
      pageContent,
      faqs,
      accommodations
    ] = await Promise.all([
      prisma.heroSection.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.feature.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.testimonial.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 6 // Limit testimonials for homepage
      }),
      prisma.galleryImage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 12 // Limit gallery images for homepage
      }),
      prisma.amenity.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.contactInfo.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.pageContent.findMany({
        where: { isActive: true }
      }),
      prisma.fAQ.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 8 // Limit FAQs for homepage
      }),
      prisma.accommodation.findMany({
        where: { isActive: true }, // Note: Accommodation is still tied to a BusinessUnit
        select: {
          id: true,
          name: true,
          type: true,
          shortDescription: true,
          pricePerNight: true,
          imageUrl: true,
          capacity: true,
          bedrooms: true,
          bathrooms: true,
          amenities: true
        },
        orderBy: { sortOrder: 'asc' },
        take: 6 // Featured accommodations
      })
    ])

    // Transform page content into a more usable format
    const contentBySection = pageContent.reduce((acc, content) => {
      if (!acc[content.section]) {
        acc[content.section] = {}
      }
      acc[content.section][content.key] = {
        value: content.value,
        type: content.type
      }
      return acc
    }, {} as Record<string, Record<string, { value: string; type: string }>>)

    // Group gallery images by category
    const galleryByCategory = galleryImages.reduce((acc, image) => {
      const category = image.category ?? 'uncategorized';
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(image)
      return acc
    }, {} as Record<string, typeof galleryImages>)

    // Group amenities by category
    const amenitiesByCategory = amenities.reduce((acc, amenity) => {
      const category = amenity.category ?? 'uncategorized';
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(amenity)
      return acc
    }, {} as Record<string, typeof amenities>)

    // Group FAQs by category
    const faqsByCategory = faqs.reduce((acc, faq) => {
      if (!acc[faq.category]) {
        acc[faq.category] = []
      }
      acc[faq.category].push(faq)
      return acc
    }, {} as Record<string, typeof faqs>)

    // Group contact info by type
    const contactByType = contactInfo.reduce((acc, contact) => {
      const type = contact.type;
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(contact)
      return acc
    }, {} as Record<string, typeof contactInfo>)

    const homepageData = {
      heroSections,
      features,
      testimonials,
      gallery: galleryByCategory,
      amenities: amenitiesByCategory,
      contact: contactByType,
      content: contentBySection,
      faqs: faqsByCategory,
      accommodations: accommodations.map(acc => ({
        ...acc,
        pricePerNight: acc.pricePerNight.toNumber()
      }))
    }

    const response = NextResponse.json(homepageData)
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
    
    return response
  } catch (error) {
    console.error("[HOMEPAGE_CONTENT_GET]", error)
    const errorResponse = new NextResponse("Internal error", { status: 500 })
    errorResponse.headers.set("Access-Control-Allow-Origin", allowedOrigin)
    return errorResponse
  }
}
