"use client"

import { useState, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, CheckCircle } from "lucide-react"

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
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-12 bg-slate-700 rounded-lg w-80 mx-auto mb-6 animate-pulse" />
            <div className="h-6 bg-slate-700 rounded-lg w-96 mx-auto animate-pulse" />
          </div>
          <div className="max-w-4xl mx-auto space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (faqs.length === 0) return null

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTQwIDQwTDIwIDIwaDQwdjQweiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <HelpCircle className="h-8 w-8 text-cyan-400" />
            <h2 className="text-5xl md:text-6xl font-bold font-serif text-white tracking-tight">
              Expert{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Support</span>
            </h2>
          </div>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Get instant answers to your questions with our comprehensive knowledge base, curated by hospitality experts
          </p>
          <div className="flex items-center justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium">Expert Verified</span>
            </div>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="text-sm font-medium">Updated Daily</div>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="text-sm font-medium">24/7 Support</div>
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap justify-center gap-3 mt-12">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className={`cursor-pointer capitalize px-6 py-3 text-sm font-medium transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/25"
                      : "bg-white/10 text-slate-300 border-slate-600 hover:bg-white/20 hover:text-white backdrop-blur-sm"
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-6">
            {filteredFAQs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-white/10 backdrop-blur-md rounded-xl border-0 hover:bg-white/15 transition-all duration-300 overflow-hidden"
              >
                <AccordionTrigger className="px-8 py-6 text-left hover:no-underline group">
                  <div className="flex items-start gap-4 w-full">
                    <HelpCircle className="h-5 w-5 text-cyan-400 mt-1 flex-shrink-0" />
                    <span className="font-semibold text-white flex-1 text-lg group-hover:text-cyan-300 transition-colors">
                      {faq.question}
                    </span>
                    <Badge className="ml-4 text-xs bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30">
                      {faq.category}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="pl-9 text-slate-300 leading-relaxed text-base border-l-2 border-cyan-500/30 ml-2">
                    {faq.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
