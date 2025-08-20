"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, ExternalLink } from "lucide-react"

interface ContactInfo {
  id: string
  type: "PHONE" | "EMAIL" | "ADDRESS" | "SOCIAL"
  label: string
  value: string
  iconName: string
  isActive: boolean
  sortOrder: number
}

const iconMap = {
  phone: Phone,
  mail: Mail,
  "map-pin": MapPin,
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
}

export function ContactSection() {
  const [contacts, setContacts] = useState<ContactInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch("/api/cms/contact-info")
        if (response.ok) {
          const data = await response.json()
          setContacts(
            data
              .filter((contact: ContactInfo) => contact.isActive)
              .sort((a: ContactInfo, b: ContactInfo) => a.sortOrder - b.sortOrder),
          )
        }
      } catch (error) {
        console.error("Failed to fetch contact info:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()
  }, [])

  const groupedContacts = contacts.reduce(
    (acc, contact) => {
      if (!acc[contact.type]) {
        acc[contact.type] = []
      }
      acc[contact.type].push(contact)
      return acc
    },
    {} as Record<string, ContactInfo[]>,
  )

  if (loading) {
    return (
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-8 bg-slate-200 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (contacts.length === 0) return null

  const formatContactValue = (contact: ContactInfo) => {
    switch (contact.type) {
      case "PHONE":
        return `tel:${contact.value.replace(/\s/g, "")}`
      case "EMAIL":
        return `mailto:${contact.value}`
      case "ADDRESS":
        return `https://maps.google.com/?q=${encodeURIComponent(contact.value)}`
      case "SOCIAL":
        return contact.value.startsWith("http") ? contact.value : `https://${contact.value}`
      default:
        return contact.value
    }
  }

  const isClickable = (type: string) => ["PHONE", "EMAIL", "ADDRESS", "SOCIAL"].includes(type)

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 font-serif">Get in Touch</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            We&quot;re here to help make your stay exceptional. Contact us anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(groupedContacts).map(([type, contactList]) => (
            <Card key={type} className="group hover:shadow-lg transition-all duration-300 border-0 bg-slate-50">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 capitalize">{type.toLowerCase()}</h3>
                  <div className="space-y-3">
                    {contactList.map((contact) => {
                      const IconComponent = iconMap[contact.iconName as keyof typeof iconMap] || Phone
                      const href = formatContactValue(contact)
                      const isLink = isClickable(contact.type)

                      return (
                        <div key={contact.id} className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <IconComponent className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-slate-900 mb-1">{contact.label}</div>
                            {isLink ? (
                              <Button variant="link" className="h-auto p-0 text-slate-600 hover:text-amber-600" asChild>
                                <a
                                  href={href}
                                  target={
                                    contact.type === "SOCIAL" || contact.type === "ADDRESS" ? "_blank" : undefined
                                  }
                                  rel={
                                    contact.type === "SOCIAL" || contact.type === "ADDRESS"
                                      ? "noopener noreferrer"
                                      : undefined
                                  }
                                  className="flex items-center gap-1"
                                >
                                  <span className="text-sm">{contact.value}</span>
                                  {(contact.type === "SOCIAL" || contact.type === "ADDRESS") && (
                                    <ExternalLink className="w-3 h-3" />
                                  )}
                                </a>
                              </Button>
                            ) : (
                              <div className="text-sm text-slate-600">{contact.value}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
