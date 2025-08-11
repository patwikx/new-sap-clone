"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, TrendingUp, TrendingDown, Package, AlertTriangle, BarChart3, MapPin, RefreshCw, ChevronsUpDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"

// Corrected interface to match the Prisma schema
interface InventoryStock {
  id: string
  quantityOnHand: number | string
  reorderPoint: number | string
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
                    className="w-full sm:w-[180px] justify-between font-normal"
                >
                    {selectedOption ? selectedOption.label : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
      setLoading(true);
      const response = await axios.get(`/api/${businessUnitId}/inventory-stocks`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setStocks(response.data)
    } catch (error) {
      toast.error("Failed to fetch stock levels")
      console.error(error)
    } finally {
      setLoading(false);
    }
  }, [businessUnitId])

  useEffect(() => {
    if (businessUnitId) {
      fetchStocks()
    }
  }, [businessUnitId, fetchStocks])

  // Calculate stock status
  const getStockStatus = (stock: InventoryStock) => {
    const quantity = Number(stock.quantityOnHand);
    const reorder = Number(stock.reorderPoint);
    const cost = Number(stock.inventoryItem.standardCost) || 0;

    const isOutOfStock = quantity === 0
    const isLowStock = quantity <= reorder && quantity > 0
    const stockValue = quantity * cost;
    
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
    const matchesCategory = categoryFilter === "all" || (stock.inventoryItem.inventoryCategory?.name === categoryFilter)
    const matchesStock = stockFilter === "all" || (stockFilter === status.status)

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
    const { isOutOfStock, isLowStock } = getStockStatus(stock)
    
    if (isOutOfStock) {
      return (
        <Badge variant="destructive" className="gap-1.5">
          <AlertTriangle className="h-3 w-3" /> Out of Stock
        </Badge>
      )
    }
    if (isLowStock) {
      return (
        <Badge variant="secondary" className="gap-1.5 text-amber-600 border-amber-500/50">
          <TrendingDown className="h-3 w-3" /> Low Stock
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="gap-1.5">
        <TrendingUp className="h-3 w-3" /> In Stock
      </Badge>
    )
  }

  if (loading && stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-muted-foreground">
            Monitor inventory stock levels across all locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchStocks} disabled={loading} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => router.push(`/${businessUnitId}/inventory/stock/adjustments`)} className="gap-2">
            <Plus className="h-4 w-4" />
            Stock Adjustment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Records</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockRecords}</div>
            <p className="text-xs text-muted-foreground">Item-location combinations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalStockValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">Total inventory value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Below reorder point</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Zero stock items</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Find stock records by item, location, category, or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
            <div className="flex-1 min-w-[250px]">
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
            <div className="flex gap-4 flex-wrap">
                <Combobox
                    options={[{ value: "all", label: "All Locations" }, ...locations.map(loc => ({ value: loc.id, label: loc.name }))]}
                    value={locationFilter}
                    onChange={setLocationFilter}
                    placeholder="Filter by location..."
                />
                <Combobox
                    options={[{ value: "all", label: "All Categories" }, ...categories.map(cat => ({ value: cat, label: cat }))]}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder="Filter by category..."
                />
                <Combobox
                    options={[
                        { value: "all", label: "All Stock Levels" },
                        { value: "normal", label: "In Stock" },
                        { value: "low", label: "Low Stock" },
                        { value: "out", label: "Out of Stock" },
                    ]}
                    value={stockFilter}
                    onChange={setStockFilter}
                    placeholder="Filter by stock..."
                />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Stock Levels Grid */}
      <div>
        {filteredStocks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStocks.map((stock) => {
              const { stockValue } = getStockStatus(stock);
              return (
                <Card key={stock.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{stock.inventoryItem.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 pt-1">
                          <MapPin className="h-3 w-3" /> {stock.location.name}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/${businessUnitId}/inventory/stock/adjustments?itemId=${stock.inventoryItem.id}&locationId=${stock.location.id}`)} className="gap-2">
                            <Plus className="h-4 w-4" /> New Adjustment
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Stock movement history coming soon")} className="gap-2">
                            <BarChart3 className="h-4 w-4" /> View Movements
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <div className="flex justify-between items-center p-4 rounded-md bg-muted/50">
                        <div>
                            <p className="text-xs text-muted-foreground">On Hand</p>
                            <p className="text-2xl font-bold">
                                {Number(stock.quantityOnHand).toLocaleString()}
                                <span className="text-base font-normal text-muted-foreground ml-1">{stock.inventoryItem.uom.symbol}</span>
                            </p>
                        </div>
                        {getStockBadge(stock)}
                    </div>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Reorder Point:</span>
                            <span>{Number(stock.reorderPoint).toLocaleString()} {stock.inventoryItem.uom.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Stock Value:</span>
                            <span className="font-medium">₱{stockValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span>{stock.inventoryItem.inventoryCategory?.name || 'N/A'}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Item Code:</span>
                            <span className="font-mono text-xs">{stock.inventoryItem.itemCode || 'N/A'}</span>
                        </div>
                    </div>
                  </CardContent>
                  {stock.movements.length > 0 && (
                    <CardFooter className="text-xs text-muted-foreground">
                      Last movement: {stock.movements[0].type} on {new Date(stock.movements[0].createdAt).toLocaleDateString()}
                    </CardFooter>
                  )}
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No stock records found</h3>
            <p className="text-muted-foreground">
              {searchTerm || locationFilter !== "all" || stockFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Stock records will appear here"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StockLevelsPage