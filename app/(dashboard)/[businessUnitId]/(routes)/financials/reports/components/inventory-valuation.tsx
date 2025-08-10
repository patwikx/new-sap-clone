"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Package, Search } from "lucide-react"
import { ReportFilters } from "./report-filter"
import axios from "axios"
import { useParams } from "next/navigation"
import { toast } from "sonner"

interface InventoryValuationData {
  asOfDate: string
  items: InventoryValuationItem[]
  summary: {
    totalQuantity: number
    totalValue: number
    itemCount: number
    locationCount: number
  }
}

interface InventoryValuationItem {
  itemCode: string
  itemName: string
  category?: string
  uom: string
  locations: {
    locationName: string
    quantityOnHand: number
    standardCost: number
    totalValue: number
  }[]
  totalQuantity: number
  totalValue: number
  averageCost: number
}

interface InventoryValuationProps {
  filters: ReportFilters
}

export const InventoryValuation = ({ filters }: InventoryValuationProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const [data, setData] = useState<InventoryValuationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchInventoryValuation()
  }, [filters])

  const fetchInventoryValuation = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/reports/inventory-valuation`, {
        headers: { 'x-business-unit-id': businessUnitId },
        params: filters
      })
      setData(response.data)
    } catch (error) {
      toast.error("Failed to fetch inventory valuation data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatQuantity = (qty: number) => {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(qty)
  }

  // Filter items based on search
  const filteredItems = data?.items.filter(item => {
    const matchesSearch = item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const hasStock = !filters.includeZeroBalances ? item.totalQuantity > 0 : true
    
    return matchesSearch && hasStock
  }) || []

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
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No data available</h3>
            <p className="text-muted-foreground">Adjust your filters and try again</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" id="inventory-valuation-report">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Inventory Valuation Report</h1>
        <p className="text-muted-foreground">As of {new Date(data.asOfDate).toLocaleDateString()}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.itemCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatQuantity(data.summary.totalQuantity)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{data.summary.locationCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by item code, name, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Items */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.itemCode} className="border rounded-lg p-4 space-y-3">
                {/* Item Header */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.itemCode} - {item.itemName}</span>
                      {item.category && (
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      UoM: {item.uom} | Avg Cost: {formatCurrency(item.averageCost)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatCurrency(item.totalValue)}</div>
                    <div className="text-sm text-muted-foreground">{formatQuantity(item.totalQuantity)} {item.uom}</div>
                  </div>
                </div>

                {/* Location Details */}
                {item.locations.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Stock by Location:</div>
                    <div className="grid gap-2">
                      {item.locations.map((location, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                          <span className="text-sm">{location.locationName}</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatCurrency(location.totalValue)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatQuantity(location.quantityOnHand)} @ {formatCurrency(location.standardCost)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No inventory items found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}