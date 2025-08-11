"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Package, AlertTriangle, BarChart3, TrendingUp, TrendingDown, ChevronsUpDown, Check, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"

// FIXED: Reverted standardCost to 'number' to match the type expected by the modal component.
interface InventoryItem {
  id: string
  name: string
  description?: string
  itemCode: string
  category?: string
  reorderPoint?: number
  standardCost?: number
  isActive: boolean
  uomId: string
  uom: {
    name: string
    symbol: string
  }
  stocks: {
    id: string
    quantityOnHand: number
    reorderPoint: number
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
        setLoading(true)
        const response = await axios.get(`/api/${businessUnitId}/inventory-items`, {
            headers: { 'x-business-unit-id': businessUnitId },
        })
        setItems(response.data)
    } catch (error) {
        toast.error("Failed to fetch inventory items")
        console.error(error)
    } finally {
        setLoading(false)
    }
  }, [businessUnitId])

  useEffect(() => {
    if (businessUnitId) {
      fetchItems()
    }
  }, [businessUnitId, fetchItems])

  // Calculate stock metrics
  const getStockMetrics = (item: InventoryItem) => {
    const totalStock = item.stocks.reduce((sum, stock) => sum + Number(stock.quantityOnHand), 0)
    const totalReorderPoint = item.stocks.reduce((sum, stock) => sum + Number(stock.reorderPoint), 0)
    const standardCost = Number(item.standardCost) || 0;
    
    const isLowStock = totalReorderPoint > 0 && totalStock <= totalReorderPoint && totalStock > 0
    const isOutOfStock = totalStock === 0
    
    return {
      totalStock,
      totalReorderPoint,
      isLowStock,
      isOutOfStock,
      stockValue: totalStock * standardCost
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
                         (stockFilter === "in-stock" && !metrics.isLowStock && !metrics.isOutOfStock) ||
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
        headers: { 'x-business-unit-id': businessUnitId }
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

  // UI Helper Functions
  const getStockBadge = (item: InventoryItem) => {
    const { isOutOfStock, isLowStock } = getStockMetrics(item)
    if (isOutOfStock) return <Badge variant="destructive" className="gap-1.5"><AlertTriangle className="h-3 w-3" /> Out of Stock</Badge>
    if (isLowStock) return <Badge variant="secondary" className="gap-1.5 text-amber-600 border-amber-500/50"><TrendingDown className="h-3 w-3" /> Low Stock</Badge>
    return <Badge variant="default" className="gap-1.5"><TrendingUp className="h-3 w-3" /> In Stock</Badge>
  }

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"} className="gap-1.5">{isActive ? "Active" : "Inactive"}</Badge>
  )
  
  if (loading && items.length === 0) {
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
          <h1 className="text-3xl font-bold tracking-tight">Inventory Items</h1>
          <p className="text-muted-foreground">Manage your inventory catalog and item master data</p>
        </div>
        <Button onClick={() => setCreateItemOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">{activeItems} active items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
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
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items below reorder point</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">Items with zero stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Item categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter inventory items by category, status, and stock level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
            <div className="flex-1 min-w-[250px]">
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
            <div className="flex gap-4 flex-wrap">
                <Combobox
                    options={[{ value: "all", label: "All Categories" }, ...categories.map(cat => ({ value: cat, label: cat }))]}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder="Filter by category..."
                />
                <Combobox
                    options={[{ value: "all", label: "All Status" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
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
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const metrics = getStockMetrics(item);
            return (
                <Card key={item.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <CardTitle className="text-base">{item.name}</CardTitle>
                                <CardDescription className="font-mono text-xs pt-1">{item.itemCode}</CardDescription>
                            </div>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setSelectedItem(item); setEditItemOpen(true); }} className="gap-2"><Edit className="h-4 w-4" /> Edit Item</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSelectedItem(item); setDeleteItemOpen(true); }} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Delete Item</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {getStatusBadge(item.isActive)}
                            {getStockBadge(item)}
                        </div>
                        <div className="text-sm space-y-2 border-t pt-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Stock:</span>
                                <span className="font-medium">{metrics.totalStock.toLocaleString()} {item.uom.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Reorder Point:</span>
                                <span className="font-medium">{metrics.totalReorderPoint.toLocaleString()} {item.uom.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Stock Value:</span>
                                <span className="font-medium">₱{metrics.stockValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                        {item.stocks.length > 0 && (
                            <div className="border-t pt-3">
                                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Stock by Location</h4>
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-2">
                                    {item.stocks.map(stock => (
                                        <div key={stock.id} className="flex justify-between text-xs">
                                            <span className="truncate pr-2">{stock.location.name}</span>
                                            <span className="font-mono flex-shrink-0">{Number(stock.quantityOnHand).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="text-xs justify-between bg-muted/50 py-2 px-4 border-t">
                       <span className="text-muted-foreground">Category: <span className="font-medium text-foreground">{item.category || 'N/A'}</span></span>
                       <span className="text-muted-foreground">UoM: <span className="font-medium text-foreground">{item.uom.name} ({item.uom.symbol})</span></span>
                    </CardFooter>
                </Card>
            )
        })
        ) : (
          <div className="md:col-span-2 xl:col-span-3 text-center py-16 border-2 border-dashed rounded-lg">
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

      {/* Modals */}
      <CreateItemModal
        isOpen={createItemOpen}
        onClose={() => setCreateItemOpen(false)}
        onSuccess={() => { fetchItems(); setCreateItemOpen(false); }}
      />
      <EditItemModal
        isOpen={editItemOpen}
        onClose={() => { setEditItemOpen(false); setSelectedItem(null); }}
        onSuccess={() => { fetchItems(); setEditItemOpen(false); setSelectedItem(null); }}
        item={selectedItem}
      />
      <AlertModal
        isOpen={deleteItemOpen}
        onClose={() => { setDeleteItemOpen(false); setSelectedItem(null); }}
        onConfirm={handleDeleteItem}
        loading={false}
      />
    </div>
  )
}

export default InventoryItemsPage