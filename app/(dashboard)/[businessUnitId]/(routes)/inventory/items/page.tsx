"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Package, AlertTriangle, BarChart3, TrendingUp, TrendingDown, ChevronsUpDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertModal } from "@/components/modals/alert-modal"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { CreateItemModal } from "./components/create-item-modal"
import { EditItemModal } from "./components/edit-item-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils" // Assuming you have a utility for class names

interface InventoryItem {
  id: string
  name: string
  description?: string
  itemCode: string
  category?: string
  reorderPoint?: number
  standardCost?: number
  isActive: boolean
  uomId: string // Added missing property
  uom: {
    name: string
    symbol: string
  }
  stocks: {
    id: string
    quantityOnHand: number
    location: {
      name: string
    }
  }[]
  createdAt: string
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


const InventoryItemsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")

  // Modal states
  const [createItemOpen, setCreateItemOpen] = useState(false)
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [deleteItemOpen, setDeleteItemOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  // Fetch data
  const fetchItems = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/inventory-items`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setItems(response.data)
    } catch (error) {
      toast.error("Failed to fetch inventory items")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchItems()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchItems])

  // Calculate stock metrics
  const getStockMetrics = (item: InventoryItem) => {
    const totalStock = item.stocks.reduce((sum, stock) => sum + Number(stock.quantityOnHand), 0)
    const isLowStock = item.reorderPoint ? totalStock <= item.reorderPoint : false
    const isOutOfStock = totalStock === 0
    
    return {
      totalStock,
      isLowStock,
      isOutOfStock,
      stockValue: item.standardCost ? totalStock * item.standardCost : 0
    }
  }

  // Filter items
  const filteredItems = items.filter(item => {
    const metrics = getStockMetrics(item)
    
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && item.isActive) ||
                          (statusFilter === "inactive" && !item.isActive)
    
    const matchesStock = stockFilter === "all" ||
                         (stockFilter === "in-stock" && metrics.totalStock > 0) ||
                         (stockFilter === "low-stock" && metrics.isLowStock) ||
                         (stockFilter === "out-of-stock" && metrics.isOutOfStock)

    return matchesSearch && matchesCategory && matchesStatus && matchesStock
  })

  // Get unique categories
  const categories = Array.from(new Set(items.map(item => item.category).filter((c): c is string => !!c)))

  // Calculate summary metrics
  const totalItems = items.length
  const activeItems = items.filter(item => item.isActive).length
  const lowStockItems = items.filter(item => getStockMetrics(item).isLowStock).length
  const outOfStockItems = items.filter(item => getStockMetrics(item).isOutOfStock).length
  const totalStockValue = items.reduce((sum, item) => sum + getStockMetrics(item).stockValue, 0)

  // Item actions
  const handleDeleteItem = async () => {
    if (!selectedItem) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/inventory-items/${selectedItem.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Inventory item deleted successfully")
      setDeleteItemOpen(false)
      setSelectedItem(null)
      fetchItems()
    } catch (error) {
      toast.error("Failed to delete inventory item")
      console.error(error)
    }
  }

  const getStockBadge = (item: InventoryItem) => {
    const metrics = getStockMetrics(item)
    
    if (metrics.isOutOfStock) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Out of Stock
        </Badge>
      )
    }
    
    if (metrics.isLowStock) {
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
        In Stock
      </Badge>
    )
  }

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"} className="gap-1">
      <Package className="h-3 w-3" />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )

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
          <h1 className="text-3xl font-bold tracking-tight">Inventory Items</h1>
          <p className="text-muted-foreground">
            Manage your inventory catalog and item master data
          </p>
        </div>
        <Button onClick={() => setCreateItemOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {activeItems} active items
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
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
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items below reorder point
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items with zero stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Item categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter and search inventory items by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
                    { value: "all", label: "All Status" },
                    { value: "active", label: "Active Only" },
                    { value: "inactive", label: "Inactive Only" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status..."
            />
            <Combobox
                options={[
                    { value: "all", label: "All Stock Levels" },
                    { value: "in-stock", label: "In Stock" },
                    { value: "low-stock", label: "Low Stock" },
                    { value: "out-of-stock", label: "Out of Stock" },
                ]}
                value={stockFilter}
                onChange={setStockFilter}
                placeholder="Filter by stock..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({filteredItems.length})</CardTitle>
          <CardDescription>
            Manage your inventory catalog and track stock levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const metrics = getStockMetrics(item)
              
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{item.name}</p>
                        {getStatusBadge(item.isActive)}
                        {getStockBadge(item)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Code: <span className="font-mono">{item.itemCode}</span></span>
                        <span>UoM: {item.uom.symbol}</span>
                        {item.category && <span>Category: {item.category}</span>}
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Stock:</span>
                          <span className="font-medium">{metrics.totalStock.toLocaleString()} {item.uom.symbol}</span>
                        </div>
                        {item.reorderPoint && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Reorder:</span>
                            <span className="font-medium">{item.reorderPoint} {item.uom.symbol}</span>
                          </div>
                        )}
                        {item.standardCost && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Value:</span>
                            <span className="font-medium">₱{metrics.stockValue.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      {item.stocks.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.stocks.map((stock) => (
                            <Badge key={stock.id} variant="outline" className="text-xs">
                              {stock.location.name}: {stock.quantityOnHand}
                            </Badge>
                          ))}
                        </div>
                      )}
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
                        onClick={() => {
                          setSelectedItem(item)
                          setEditItemOpen(true)
                        }}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Item
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedItem(item)
                          setDeleteItemOpen(true)
                        }}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Item
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No inventory items found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by adding your first inventory item"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateItemModal
        isOpen={createItemOpen}
        onClose={() => setCreateItemOpen(false)}
        onSuccess={() => {
          fetchItems()
          setCreateItemOpen(false)
        }}
      />

      <EditItemModal
        isOpen={editItemOpen}
        onClose={() => {
          setEditItemOpen(false)
          setSelectedItem(null)
        }}
        onSuccess={() => {
          fetchItems()
          setEditItemOpen(false)
          setSelectedItem(null)
        }}
        item={selectedItem}
      />

      <AlertModal
        isOpen={deleteItemOpen}
        onClose={() => {
          setDeleteItemOpen(false)
          setSelectedItem(null)
        }}
        onConfirm={handleDeleteItem}
        loading={false}
      />
    </div>
  )
}

export default InventoryItemsPage
