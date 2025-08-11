"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Minus, Search, ShoppingCart, Utensils, X, Send, Save, Home, ChevronRight, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import type { MenuItem, MenuCategory, CurrentOrder, NewOrder } from "@/types/pos"

interface MenuOrderItem {
  menuItemId: string
  menuItem: MenuItem
  quantity: number
  unitPrice: number
  lineTotal: number
  notes?: string // Made optional to match the interface
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱")
}

export default function NewOrderPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessUnitId = params.businessUnitId as string

  // Get URL parameters
  const tableId = searchParams.get("tableId")
  const customerName = searchParams.get("customerName")
  const orderId = searchParams.get("orderId")

  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [orderItems, setOrderItems] = useState<MenuOrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder>(null)
  const [tableName, setTableName] = useState<string>("")

  // Move loadExistingOrder inside useEffect or use useCallback
  const loadExistingOrder = useCallback(
    async (orderId: string) => {
      try {
        const response = await axios.get(`/api/${businessUnitId}/pos/orders/${orderId}`, {
          headers: {
            "x-business-unit-id": businessUnitId,
            "x-order-id": orderId,
          },
        })
        setCurrentOrder(response.data)
      } catch (error) {
        toast.error("Failed to load existing order")
        console.error(error)
      }
    },
    [businessUnitId],
  )

  // Initialize order from URL params or existing order
  useEffect(() => {
    if (tableId && customerName && !orderId) {
      // New order
      const newOrder: NewOrder = {
        tableId,
        customerName: decodeURIComponent(customerName),
        items: [],
        totalAmount: 0,
      }
      setCurrentOrder(newOrder)
    } else if (orderId) {
      // Load existing order
      loadExistingOrder(orderId)
    }
  }, [tableId, customerName, orderId, loadExistingOrder])

  // Fetch menu data
  const fetchMenuData = useCallback(async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        axios.get<MenuItem[]>(`/api/${businessUnitId}/pos/menu-items`, {
          headers: { "x-business-unit-id": businessUnitId },
        }),
        axios.get<MenuCategory[]>(`/api/${businessUnitId}/pos/menu-categories`, {
          headers: { "x-business-unit-id": businessUnitId },
        }),
      ])
      setMenuItems(itemsRes.data)
      setMenuCategories(categoriesRes.data)
    } catch (error) {
      toast.error("Failed to fetch menu data")
      console.error(error)
    }
  }, [businessUnitId])

  // Fetch table name
  const fetchTableName = useCallback(async () => {
    if (!tableId) return
    try {
      const response = await axios.get(`/api/${businessUnitId}/pos/tables/${tableId}`, {
        headers: {
          "x-business-unit-id": businessUnitId,
          "x-table-id": tableId,
        },
      })
      setTableName(response.data.name)
    } catch (error) {
      console.error("Failed to fetch table name:", error)
      // Fallback: just use the tableId as the name if the API call fails
      setTableName(`Table ${tableId}`)
    }
  }, [businessUnitId, tableId])

  useEffect(() => {
    fetchMenuData()
    fetchTableName()
  }, [fetchMenuData, fetchTableName])

  // Initialize order items from current order - FIXED VERSION
  useEffect(() => {
    if (currentOrder?.items && menuItems.length > 0) {
      const validItems: MenuOrderItem[] = []

      for (const item of currentOrder.items) {
        // Find the corresponding menu item from the current menu data
        const menuItem = menuItems.find((mi) => mi.name === item.menuItemName)

        if (menuItem) {
          validItems.push({
            menuItemId: menuItem.id, // Use the current menu item ID, not the old one
            menuItem: menuItem,
            quantity: item.quantity,
            unitPrice: item.priceAtSale,
            lineTotal: item.lineTotal,
            notes: "", // Provide default empty string
          })
        } else {
          console.warn(`Menu item not found for: ${item.menuItemName}`)
        }
      }

      console.log("Mapped order items:", validItems)
      setOrderItems(validItems)
    } else {
      setOrderItems([])
    }
  }, [currentOrder, menuItems]) // Added menuItems as dependency

  // Filter menu items
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category.name === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch && item.isActive
  })

  // Calculate totals - ensure numeric addition
  const subtotal = orderItems.reduce((sum, item) => {
    return (
      sum + (typeof item.lineTotal === "number" ? item.lineTotal : Number.parseFloat(item.lineTotal) || 0)
    )
  }, 0)
  const tax = subtotal * 0.12 // 12% VAT
  const total = subtotal + tax

  const addToOrder = (menuItem: MenuItem) => {
    const existingItem = orderItems.find((item) => item.menuItemId === menuItem.id)

    if (existingItem) {
      updateQuantity(menuItem.id, existingItem.quantity + 1)
    } else {
      const newItem: MenuOrderItem = {
        menuItemId: menuItem.id,
        menuItem,
        quantity: 1,
        unitPrice: Number.parseFloat(menuItem.price.toString()),
        lineTotal: Number.parseFloat(menuItem.price.toString()),
        notes: "", // Provide default empty string
      }
      setOrderItems([...orderItems, newItem])
    }
  }

  const updateQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromOrder(menuItemId)
      return
    }

    setOrderItems(
      orderItems.map((item) =>
        item.menuItemId === menuItemId
          ? { ...item, quantity: newQuantity, lineTotal: newQuantity * Number.parseFloat(item.unitPrice.toString()) }
          : item,
      ),
    )
  }

  const removeFromOrder = (menuItemId: string) => {
    setOrderItems(orderItems.filter((item) => item.menuItemId !== menuItemId))
  }

  const saveOrder = async (sendToKitchen = false) => {
    if (orderItems.length === 0) {
      toast.error("Please add items to the order")
      return
    }

    if (!currentOrder) {
      toast.error("No order context available")
      return
    }

    try {
      setLoading(true)

      // Validate that all menu items still exist before sending
      const menuItemIds = orderItems.map((item) => item.menuItemId)
      const validMenuItems = menuItems.filter((mi) => menuItemIds.includes(mi.id))

      if (validMenuItems.length !== orderItems.length) {
        toast.error("Some menu items are no longer available. Please refresh and try again.")
        return
      }

      const orderData = {
        tableId: currentOrder.tableId,
        customerName: currentOrder.customerName,
        items: orderItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          priceAtSale: item.unitPrice, // Changed from unitPrice to priceAtSale
          notes: item.notes || "", // Ensure notes is always a string
        })),
        sendToKitchen,
      }

      console.log("Sending order data:", orderData)

      const headers = {
        "x-business-unit-id": businessUnitId,
        "x-table-id": currentOrder.tableId,
      }

      let response
      if ("id" in currentOrder && currentOrder.id) {
        // Update existing order - add order ID to headers
        response = await axios.patch(`/api/${businessUnitId}/pos/orders/${currentOrder.id}`, orderData, {
          headers: {
            ...headers,
            "x-order-id": currentOrder.id,
          },
        })
      } else {
        // Create new order
        response = await axios.post(`/api/${businessUnitId}/pos/orders`, orderData, {
          headers,
        })
      }

      toast.success(sendToKitchen ? "Order sent to kitchen" : "Order saved")
      router.push(`/${businessUnitId}/pos`)
    } catch (error) {
      console.error("Save order error:", error)
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        toast.error(`Failed to save order: ${error.response.data || "Invalid request"}`)
      } else {
        toast.error("Failed to save order")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${businessUnitId}/pos`)
  }

  return (
    <div className="h-screen w-full px-6 py-4 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Page Header with Breadcrumbs - Compact */}
      <div className="space-y-2 mb-4 flex-shrink-0">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}`} className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/pos`}>Point of Sale</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Order</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Title and Back Button - Compact */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleCancel} className="gap-2 bg-transparent h-8">
            <ArrowLeft className="h-4 w-4" />
            Back to POS
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              {orderId ? "Edit Order" : "New Order"} - {tableName || `Table ${tableId}`}
            </h1>
            <p className="text-sm text-muted-foreground">Customer: {currentOrder?.customerName || "Walk-in"}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Menu Items Section */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search and Categories - Compact */}
          <Card className="mb-3 flex-shrink-0">
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className="h-7 text-xs"
                  >
                    All Items
                  </Button>
                  {menuCategories
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.name)}
                        className="whitespace-nowrap h-7 text-xs"
                      >
                        {category.name}
                      </Button>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Menu Items Grid - Fixed height with scroll */}
          <Card className="flex-1 min-h-0">
            <CardContent className="p-4 h-full">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
                  {filteredMenuItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2 hover:border-primary/20"
                      onClick={() => addToOrder(item)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm leading-tight line-clamp-2 flex-1">{item.name}</h4>
                            <div className="bg-primary/10 rounded-full p-1 flex-shrink-0">
                              <Plus className="h-3 w-3 text-primary" />
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {item.category.name}
                            </Badge>
                            <span className="font-bold text-primary text-sm">{formatCurrency(item.price)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {filteredMenuItems.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No menu items found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or category filter</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Section - Starts from top and maximizes height */}
        <div className="w-80 h-full flex flex-col overflow-hidden">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardContent className="p-4 flex flex-col h-full overflow-hidden">
              {/* Header - Fixed */}
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Current Order
                </h3>
                <Badge variant="outline" className="text-xs">
                  {orderItems.length} items
                </Badge>
              </div>

              {/* Order Items - Scrollable and takes most space */}
              <div className="flex-1 min-h-0 mb-3 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-2 pr-2">
                    {orderItems.map((item) => (
                      <div key={item.menuItemId} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-1">{item.menuItem.name}</h4>
                            <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromOrder(item.menuItemId)}
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-bold text-primary text-sm">{formatCurrency(item.lineTotal)}</span>
                        </div>
                      </div>
                    ))}
                    {orderItems.length === 0 && (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No items in order</p>
                        <p className="text-sm text-muted-foreground">Click on menu items to add them</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Order Totals and Actions - Fixed at bottom */}
              <div className="space-y-3 border-t pt-3 flex-shrink-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (12%):</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => saveOrder(false)}
                    disabled={loading || orderItems.length === 0}
                    className="w-full gap-2 h-10"
                    variant="outline"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? "Saving..." : "Save Order"}
                  </Button>
                  <Button
                    onClick={() => saveOrder(true)}
                    disabled={loading || orderItems.length === 0}
                    className="w-full gap-2 h-10"
                  >
                    <Send className="h-4 w-4" />
                    {loading ? "Sending..." : "Send to Kitchen"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
