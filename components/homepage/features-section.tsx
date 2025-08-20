import { Card, CardContent } from "@/components/ui/card"
import { Wifi, Car, Utensils, Dumbbell, Waves, Coffee, Shield, Clock, Users, MapPin, Star, Heart } from "lucide-react"

interface Feature {
  id: string
  title: string
  description: string
  iconName: string
  isActive: boolean
  sortOrder: number
}

interface FeaturesSectionProps {
  features: Feature[]
}

const iconMap = {
  wifi: Wifi,
  car: Car,
  utensils: Utensils,
  dumbbell: Dumbbell,
  waves: Waves,
  coffee: Coffee,
  shield: Shield,
  clock: Clock,
  users: Users,
  "map-pin": MapPin,
  star: Star,
  heart: Heart,
}

export function FeaturesSection({ features }: FeaturesSectionProps) {
  if (!features.length) return null

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-serif text-primary mb-4">Why Choose Us</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience exceptional service and world-class amenities designed for your comfort and convenience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const IconComponent = iconMap[feature.iconName as keyof typeof iconMap] || Star

            return (
              <Card key={feature.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-6">
                    <IconComponent className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
