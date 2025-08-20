"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Menu, Phone, Mail, MapPin, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"

const navigationItems = [
  { name: "Home", href: "/" },
  {
    name: "Accommodations",
    href: "#accommodations",
    submenu: [
      { name: "Deluxe Rooms", href: "#accommodations" },
      { name: "Suites", href: "#accommodations" },
      { name: "Presidential Suite", href: "#accommodations" },
    ],
  },
  {
    name: "Amenities",
    href: "#amenities",
    submenu: [
      { name: "Spa & Wellness", href: "#amenities" },
      { name: "Dining", href: "#amenities" },
      { name: "Recreation", href: "#amenities" },
    ],
  },
  {
    name: "Services",
    href: "#services",
    submenu: [
      { name: "Concierge", href: "#services" },
      { name: "Room Service", href: "#services" },
      { name: "Business Center", href: "#services" },
    ],
  },
  { name: "Gallery", href: "#gallery" },
  { name: "Contact", href: "#contact" },
]

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Hide/show header based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      // Add background blur when scrolled
      setIsScrolled(currentScrollY > 50)
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-white/90 backdrop-blur-sm",
        isVisible ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div className="hidden lg:block bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center py-2 text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 hover:text-amber-100 transition-colors cursor-pointer">
                <Phone className="h-3 w-3" />
                <span className="font-medium">+63 552-6517</span>
              </div>
              <div className="w-px h-4 bg-amber-300"></div>
              <div className="flex items-center gap-2 hover:text-amber-100 transition-colors cursor-pointer">
                <Mail className="h-3 w-3" />
                <span className="font-medium">info@doloreshotels.com.ph</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-90">
              <MapPin className="h-3 w-3" />
              <span>Cagampang Ext. Brgy. Bula, General Santos City</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Image src="https://uwo3lp7kc6.ufs.sh/f/p7a48sEgH7hx0MDfBoHIAEuzgCDLmFQic5Tb2deM3lvkfZPn" height={40} width={40} alt="TWC Logo" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors font-serif">
                Tropicana
              </span>
              <span className="text-xs text-gray-500 -mt-1 font-medium">Worldwide Corporation</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <div key={item.name} className="relative group">
                {item.submenu ? (
                  <>
                    <button className="flex items-center gap-1 text-gray-700 hover:text-amber-600 transition-colors font-medium text-sm py-2">
                      {item.name}
                      <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
                    </button>
                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="block px-4 py-2 text-sm text-gray-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="text-gray-700 hover:text-amber-600 transition-colors font-medium text-sm py-2"
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Button
              asChild
              className="hidden sm:inline-flex bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Link href="#contact">Book Now</Link>
            </Button>

            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-amber-600">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-80 bg-white p-0">
                <SheetHeader className="p-4">
                  <SheetTitle className="text-left">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">L</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-gray-900 font-serif">Tropicana</span>
                        <span className="text-xs text-gray-500 -mt-1">Worldwide Corporation</span>
                      </div>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-80px)] px-4 pb-4">
                  <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-amber-600" />
                        <span>+1 (555) 123-4567</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-amber-600" />
                        <span>info@luxuryhotel.com</span>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="space-y-1">
                      {navigationItems.map((item) => (
                        <div key={item.name}>
                          <Link
                            href={item.href}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-amber-50 transition-colors group"
                          >
                            <span className="font-medium text-gray-700 group-hover:text-amber-600">{item.name}</span>
                            {item.submenu && <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </Link>
                          {item.submenu && (
                            <div className="ml-4 mt-1 space-y-1">
                              {item.submenu.map((subItem) => (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className="block p-2 text-sm text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                >
                                  {subItem.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </nav>

                    {/* Mobile CTA */}
                    <Button
                      asChild
                      className="ml-2 w-[300px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-3 shadow-md"
                    >
                      <Link href="#contact">Book Now</Link>
                    </Button>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
