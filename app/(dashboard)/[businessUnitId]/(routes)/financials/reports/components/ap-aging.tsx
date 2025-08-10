"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, AlertTriangle, Clock } from "lucide-react"
import { ReportFilters } from "./report-filter"
import axios from "axios"
import { useParams } from "next/navigation"
import { toast } from "sonner"

interface APAgingData {
  asOfDate: string
  vendors: VendorAging[]
  summary: {
    current: number
    days1to30: number
    days31to60: number
    days61to90: number
    over90: number
    totalPayables: number
  }
}

interface VendorAging {
  bpCode: string
  vendorName: string
  current: number
  days1to30: number
  days31to60: number
  days61to90: number
  over90: number
  totalBalance: number
  oldestInvoiceDate?: string
}

interface APAgingProps {
  filters: ReportFilters
}

export const APAging = ({ filters }: APAgingProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const [data, setData] = useState<APAgingData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAPAging()
  }, [filters])

  const fetchAPAging = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/reports/ap-aging`, {
        headers: { 'x-business-unit-id': businessUnitId },
        params: filters
      })
      setData(response.data)
    } catch (error) {
      toast.error("Failed to fetch AP aging data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "-"
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getAgingBadge = (vendor: VendorAging) => {
    if (vendor.over90 > 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>
    }
    if (vendor.days61to90 > 0) {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Due Soon</Badge>
    }
    return <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" />Current</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No data available</h3>
            <p className="text-muted-foreground">Adjust your filters and try again</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" id="ap-aging-report">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Accounts Payable Aging</h1>
        <p className="text-muted-foreground">As of {new Date(data.asOfDate).toLocaleDateString()}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(data.summary.current)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">1-30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-600">{formatCurrency(data.summary.days1to30)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">31-60 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{formatCurrency(data.summary.days31to60)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">61-90 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatCurrency(data.summary.days61to90)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Over 90 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-800">{formatCurrency(data.summary.over90)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Aging */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Aging Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table Header */}
          <div className="grid grid-cols-16 gap-2 text-sm font-medium text-muted-foreground border-b pb-3 mb-4">
            <div className="col-span-2">Vendor Code</div>
            <div className="col-span-4">Vendor Name</div>
            <div className="col-span-2 text-right">Current</div>
            <div className="col-span-2 text-right">1-30 Days</div>
            <div className="col-span-2 text-right">31-60 Days</div>
            <div className="col-span-2 text-right">61-90 Days</div>
            <div className="col-span-2 text-right">Over 90 Days</div>
          </div>

          {/* Vendor Rows */}
          <div className="space-y-2">
            {data.vendors.map((vendor) => (
              <div key={vendor.bpCode} className="grid grid-cols-16 gap-2 items-center py-2 hover:bg-muted/50 rounded-md px-2">
                <div className="col-span-2 font-mono text-sm">{vendor.bpCode}</div>
                <div className="col-span-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{vendor.vendorName}</span>
                    {getAgingBadge(vendor)}
                  </div>
                  {vendor.oldestInvoiceDate && (
                    <div className="text-xs text-muted-foreground">
                      Oldest: {new Date(vendor.oldestInvoiceDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-right text-sm">{formatCurrency(vendor.current)}</div>
                <div className="col-span-2 text-right text-sm">{formatCurrency(vendor.days1to30)}</div>
                <div className="col-span-2 text-right text-sm">{formatCurrency(vendor.days31to60)}</div>
                <div className="col-span-2 text-right text-sm">{formatCurrency(vendor.days61to90)}</div>
                <div className="col-span-2 text-right text-sm">{formatCurrency(vendor.over90)}</div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="grid grid-cols-16 gap-2 items-center py-3 bg-muted/50 rounded-md px-2 font-bold">
            <div className="col-span-6 text-lg">Total</div>
            <div className="col-span-2 text-right text-lg">{formatCurrency(data.summary.current)}</div>
            <div className="col-span-2 text-right text-lg">{formatCurrency(data.summary.days1to30)}</div>
            <div className="col-span-2 text-right text-lg">{formatCurrency(data.summary.days31to60)}</div>
            <div className="col-span-2 text-right text-lg">{formatCurrency(data.summary.days61to90)}</div>
            <div className="col-span-2 text-right text-lg">{formatCurrency(data.summary.over90)}</div>
          </div>

          <div className="mt-4 p-3 rounded-md bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Payables:</span>
              <span className="font-bold text-lg">{formatCurrency(data.summary.totalPayables)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}