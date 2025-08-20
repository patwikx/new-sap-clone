import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Bed, Bath } from "lucide-react"

interface Accommodation {
  id: string
  name: string
  type: string
  shortDescription: string
  pricePerNight: number
  imageUrl: string
  capacity: number
  bedrooms: number
  bathrooms: number
  amenities: string[]
}

interface AccommodationsSectionProps {
  accommodations: Accommodation[]
}

export function AccommodationsSection({ accommodations }: AccommodationsSectionProps) {
  if (!accommodations.length) return null

  return (
    <section id="accommodations" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-serif text-primary mb-4">Luxury Accommodations</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose from our carefully curated selection of premium rooms and suites
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {accommodations.map((accommodation) => (
            <Card
              key={accommodation.id}
              className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative h-64">
                <img
                  src={accommodation.imageUrl || `/placeholder.svg?height=256&width=400&query=${accommodation.name}`}
                  alt={accommodation.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-white/90 text-primary">
                    {accommodation.type}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-primary">{accommodation.name}</h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent">${accommodation.pricePerNight}</div>
                    <div className="text-sm text-muted-foreground">per night</div>
                  </div>
                </div>

                <p className="text-muted-foreground mb-4 leading-relaxed">{accommodation.shortDescription}</p>

                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{accommodation.capacity} guests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    <span>{accommodation.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    <span>{accommodation.bathrooms} bath</span>
                  </div>
                </div>

                {accommodation.amenities.length > 0 && (
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-2">
                      {accommodation.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {accommodation.amenities.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{accommodation.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button className="w-full bg-accent hover:bg-accent/90">Book Now</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
