"use client"

import { useState, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  isActive: boolean
  sortOrder: number
}

export function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await fetch("/api/cms/faqs")
        if (response.ok) {
          const data = await response.json()
          setFaqs(data.filter((faq: FAQ) => faq.isActive).sort((a: FAQ, b: FAQ) => a.sortOrder - b.sortOrder))
        }
      } catch (error) {
        console.error("Failed to fetch FAQs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFAQs()
  }, [])

  const categories = ["all", ...Array.from(new Set(faqs.map((faq) => faq.category)))]
  const filteredFAQs = selectedCategory === "all" ? faqs : faqs.filter((faq) => faq.category === selectedCategory)

  if (loading) {
    return (
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-8 bg-slate-200 rounded w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-96 mx-auto animate-pulse" />
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (faqs.length === 0) return null

  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 font-serif">Frequently Asked Questions</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Find answers to common questions about our services and amenities
          </p>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer capitalize px-4 py-2 hover:bg-slate-200"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {filteredFAQs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-white rounded-lg border-0 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                  <div className="flex items-start gap-3 w-full">
                    <span className="font-semibold text-slate-900 flex-1">{faq.question}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {faq.category}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="text-slate-700 leading-relaxed">{faq.answer}</div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
