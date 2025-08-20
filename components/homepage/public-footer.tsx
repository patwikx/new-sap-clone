import Link from "next/link"
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from "lucide-react"

export function PublicFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold font-serif mb-4">Luxury Hotel</h3>
            <p className="text-primary-foreground/80 mb-4">
              Experience unparalleled luxury and comfort in the heart of the city. Your perfect getaway awaits.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#accommodations"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Accommodations
                </Link>
              </li>
              <li>
                <Link
                  href="#amenities"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Amenities
                </Link>
              </li>
              <li>
                <Link
                  href="#gallery"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="#contact"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Room Service
                </Link>
              </li>
              <li>
                <Link href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Concierge
                </Link>
              </li>
              <li>
                <Link href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Spa & Wellness
                </Link>
              </li>
              <li>
                <Link href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Business Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-primary-foreground/80" />
                <span className="text-primary-foreground/80">123 Luxury Ave, City, State 12345</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary-foreground/80" />
                <span className="text-primary-foreground/80">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary-foreground/80" />
                <span className="text-primary-foreground/80">info@luxuryhotel.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-primary-foreground/80">© 2024 Luxury Hotel. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
