import type React from "react"
import { Inter, Playfair_Display } from 'next/font/google'
import { PublicHeader } from "@/components/homepage/public-header"
import { PublicFooter } from "@/components/homepage/public-footer"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
})

export const metadata = {
  title: "Luxury Hotel - Premium Accommodations & Amenities",
  description:
    "Experience luxury and comfort at our premium hotel with world-class amenities, exceptional service, and elegant accommodations.",
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} antialiased`}>
      {/* Fixed hydration error by using concrete background color instead of CSS custom property */}
      <body className="min-h-screen" suppressHydrationWarning>
        <PublicHeader />
        {children}
        <PublicFooter />
      </body>
    </html>
  )
}
