import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "sonner"
import type { PosAccountingSummary } from "@/lib/services/pos-accounting-service"

interface ValidationResult {
  isValid: boolean
  issues: string[]
  warnings: string[]
}

export function useOrderAccounting(orderId: string, businessUnitId: string) {
  const [summary, setSummary] = useState<PosAccountingSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)

  const fetchSummary = async () => {
    if (!orderId || !businessUnitId) return

    try {
      setLoading(true)
      const response = await axios.get(
        `/api/${businessUnitId}/pos/orders/${orderId}/accounting-summary`,
        {
          headers: { "x-business-unit-id": businessUnitId }
        }
      )
      setSummary(response.data)
    } catch (error) {
      console.error("Failed to fetch accounting summary:", error)
      toast.error("Failed to load accounting information")
    } finally {
      setLoading(false)
    }
  }

  const postToGl = async () => {
    if (!orderId || !businessUnitId) return

    try {
      setPosting(true)
      const response = await axios.post(
        `/api/${businessUnitId}/pos/orders/${orderId}/post-to-gl`,
        {},
        {
          headers: { 
            "x-business-unit-id": businessUnitId,
            "x-order-id": orderId
          }
        }
      )
      
      toast.success("Order posted to General Ledger successfully")
      await fetchSummary() // Refresh summary
      
      return response.data
    } catch (error) {
      console.error("Failed to post to GL:", error)
      if (axios.isAxiosError(error) && error.response?.data) {
        toast.error(`Failed to post to GL: ${error.response.data}`)
      } else {
        toast.error("Failed to post to General Ledger")
      }
      throw error
    } finally {
      setPosting(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [orderId, businessUnitId])

  return {
    summary,
    loading,
    posting,
    fetchSummary,
    postToGl
  }
}
