"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, TrendingUp, TrendingDown, Package, AlertTriangle, BarChart3, MapPin, RefreshCw, ChevronsUpDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils" // Assuming you have a utility for class names

// Corrected interface to match the Prisma schema
interface InventoryStock {
  id: string
  quantityOnHand: number
  reorderPoint: number
  inventoryItem: {
    id: string
    name: string
    itemCode: string | null
    standardCost?: number | null
    inventoryCategory: {
      name: string
    } | null
    uom: {
      symbol: string
    }
  }
  location: {
    id: string
    name: string
  }
  movements: {
    id: string
    type: string
    quantity: number
    createdAt: string
  }[]
}

// Reusable Combobox Component
const Combobox = ({ options, value, onChange, placeholder }: { options: { value: string, label: string }[], value: string, onChange: (value: string) => void, placeholder: string }) => {
    const [open, setOpen] = useState(false)
    const selectedOption = options.find(option => option.value === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[180px] justify-between font-normal"
                >
                    {selectedOption ? selectedOption.label : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0">
                <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                        {options.map((option) => (
                            <CommandItem
                                key={option.value}
                                value={option.label}
                                onSelect={() => {
                                    onChange(option.value === value ? "all" : option.value)
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === option.value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

const StockLevelsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [stocks, setStocks] = useState<InventoryStock[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const router = useRouter();

  // Fetch data
  const fetchStocks = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/inventory-stocks`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setStocks(response.data)
    } catch (error) {
      toast.error("Failed to fetch stock levels")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchStocks()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchStocks])

  // Calculate stock status
  const getStockStatus = (stock: InventoryStock) => {
    const isOutOfStock = Number(stock.quantityOnHand) === 0
    const isLowStock = Number(stock.quantityOnHand) <= Number(stock.reorderPoint) && Number(stock.quantityOnHand) > 0
    const stockValue = stock.inventoryItem.standardCost ? 
      Number(stock.quantityOnHand) * Number(stock.inventoryItem.standardCost) : 0
    
    return {
      isOutOfStock,
      isLowStock,
      stockValue,
      status: isOutOfStock ? 'out' : isLowStock ? 'low' : 'normal'
    }
  }

  // Filter stocks
  const filteredStocks = stocks.filter(stock => {
    const status = getStockStatus(stock)
    
    const matchesSearch = stock.inventoryItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (stock.inventoryItem.itemCode && stock.inventoryItem.itemCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          stock.location.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLocation = locationFilter === "all" || stock.location.id === locationFilter
    const matchesCategory = categoryFilter === "all" || stock.inventoryItem.inventoryCategory?.name === categoryFilter
    const matchesStock = stockFilter === "all" ||
                         (stockFilter === "normal" && status.status === 'normal') ||
                         (stockFilter === "low" && status.status === 'low') ||
                         (stockFilter === "out" && status.status === 'out')

    return matchesSearch && matchesLocation && matchesCategory && matchesStock
  })

  // Get unique locations and categories
  const locations = [...new Map(stocks.map(stock => [stock.location.id, stock.location])).values()];
  const categories = Array.from(new Set(stocks.map(stock => stock.inventoryItem.inventoryCategory?.name).filter((c): c is string => !!c)))

  // Calculate summary metrics
  const totalStockRecords = stocks.length
  const lowStockCount = stocks.filter(stock => getStockStatus(stock).isLowStock).length
  const outOfStockCount = stocks.filter(stock => getStockStatus(stock).isOutOfStock).length
  const totalStockValue = stocks.reduce((sum, stock) => sum + getStockStatus(stock).stockValue, 0)

  const getStockBadge = (stock: InventoryStock) => {
    const status = getStockStatus(stock)
    
    if (status.isOutOfStock) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Out of Stock
        </Badge>
      )
    }
    
    if (status.isLowStock) {
      return (
        <Badge variant="secondary" className="gap-1">
          <TrendingDown className="h-3 w-3" />
          Low Stock
        </Badge>
      )
    }
    
    return (
      <Badge variant="default" className="gap-1">
        <TrendingUp className="h-3 w-3" />
        Normal
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-muted-foreground">
            Monitor inventory stock levels across all locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchStocks} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => router.push(`/${businessUnitId}/inventory/stock/adjustments`)} className="gap-2">
            <Plus className="h-4 w-4" />
            Stock Adjustment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Records</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockRecords}</div>
            <p className="text-xs text-muted-foreground">
              Item-location combinations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalStockValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Below reorder point
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Zero stock items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter stock levels by location, category, and stock status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by item name, code, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Combobox
                options={[
                    { value: "all", label: "All Locations" },
                    ...locations.map(loc => ({ value: loc.id, label: loc.name }))
                ]}
                value={locationFilter}
                onChange={setLocationFilter}
                placeholder="Filter by location..."
            />
            <Combobox
                options={[
                    { value: "all", label: "All Categories" },
                    ...categories.map(cat => ({ value: cat, label: cat }))
                ]}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Filter by category..."
            />
            <Combobox
                options={[
                    { value: "all", label: "All Stock Levels" },
                    { value: "normal", label: "Normal Stock" },
                    { value: "low", label: "Low Stock" },
                    { value: "out", label: "Out of Stock" },
                ]}
                value={stockFilter}
                onChange={setStockFilter}
                placeholder="Filter by stock..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Stock Levels List */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels ({filteredStocks.length})</CardTitle>
          <CardDescription>
            Current inventory levels across all locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStocks.map((stock) => {
              const status = getStockStatus(stock)
              
              return (
                <div
                  key={stock.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{stock.inventoryItem.name}</h3>
                        {getStockBadge(stock)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Code: <span className="font-mono">{stock.inventoryItem.itemCode}</span></span>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {stock.location.name}
                        </div>
                        {stock.inventoryItem.inventoryCategory && (
                          <span>Category: {stock.inventoryItem.inventoryCategory.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">On Hand:</span>
                          <span className="font-bold text-lg">{Number(stock.quantityOnHand).toLocaleString()} {stock.inventoryItem.uom.symbol}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Reorder Point:</span>
                          <span className="font-medium">{Number(stock.reorderPoint)} {stock.inventoryItem.uom.symbol}</span>
                        </div>
                        {stock.inventoryItem.standardCost && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Value:</span>
                            <span className="font-medium">₱{status.stockValue.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      {stock.movements.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Last movement: {stock.movements[0].type} • {new Date(stock.movements[0].createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {Number(stock.quantityOnHand).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stock.inventoryItem.uom.symbol}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => router.push(`/${businessUnitId}/inventory/stock/adjustments`)}
                          className="gap-2"
                        >
                          <TrendingUp className="h-4 w-4" />
                          Stock Adjustment
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.info("Stock movement history coming soon")}
                          className="gap-2"
                        >
                          <BarChart3 className="h-4 w-4" />
                          View Movements
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}

            {filteredStocks.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No stock records found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || locationFilter !== "all" || stockFilter !== "all" || categoryFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Stock records will appear here when you receive inventory"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StockLevelsPage
