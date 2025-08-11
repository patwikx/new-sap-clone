"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Minus, Search, ShoppingCart, Utensils, X, Send, Save } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import type { MenuItem, MenuCategory, CurrentOrder, ExistingOrder, NewOrder } from "@/types/pos"

interface MenuOrderItem {
  menuItemId: string
  menuItem: MenuItem
  quantity: number
  unitPrice: number
  lineTotal: number
  notes?: string
}

interface MenuDialogProps {
  isOpen: boolean
  onClose: () => void
  menuItems: MenuItem[]
  menuCategories: MenuCategory[]
  currentOrder: CurrentOrder
  onOrderUpdate: (order: ExistingOrder | NewOrder) => void
  businessUnitId: string
}

export const MenuDialog = ({
  isOpen,
  onClose,
  menuItems,
  menuCategories,
  currentOrder,
  onOrderUpdate,
  businessUnitId,
}: MenuDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [orderItems, setOrderItems] = useState<MenuOrderItem[]>([])
  const [loading, setLoading] = useState(false)

  // Initialize order items from current order
  useEffect(() => {
    if (currentOrder?.items) {
      const items = currentOrder.items.map((item) => ({
        menuItemId: item.id, // Use the item ID as menuItemId
        menuItem: {
          id: item.id,
          name: item.menuItemName,
          price: item.priceAtSale,
          category: { name: "Unknown" }, // We don't have category info in the order item
          isActive: true,
        } as MenuItem,
        quantity: item.quantity,
        unitPrice: item.priceAtSale,
        lineTotal: item.lineTotal,
        notes: "",
      }))
      setOrderItems(items)
    } else {
      setOrderItems([])
    }
  }, [currentOrder])

  // Filter menu items
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category.name === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch && item.isActive
  })

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0)
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
        unitPrice: menuItem.price,
        lineTotal: menuItem.price,
        notes: "",
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
          ? { ...item, quantity: newQuantity, lineTotal: newQuantity * item.unitPrice }
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
      const orderData = {
        tableId: currentOrder.tableId,
        customerName: currentOrder.customerName,
        items: orderItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        })),
        sendToKitchen,
      }

      let response
      if ("id" in currentOrder && currentOrder.id) {
        // Update existing order
        response = await axios.patch(`/api/${businessUnitId}/pos/orders/${currentOrder.id}`, orderData, {
          headers: { "x-business-unit-id": businessUnitId },
        })
      } else {
        // Create new order
        response = await axios.post(`/api/${businessUnitId}/pos/orders`, orderData, {
          headers: { "x-business-unit-id": businessUnitId },
        })
      }

      toast.success(sendToKitchen ? "Order sent to kitchen" : "Order saved")
      onOrderUpdate(response.data)
      onClose()
    } catch (error) {
      toast.error("Failed to save order")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0">
        <div className="flex h-[90vh]">
          {/* Menu Items Section - Made more compact */}
          <div className="flex-1 flex flex-col min-w-0">
            <DialogHeader className="p-4 pb-3 border-b">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Utensils className="h-5 w-5" />
                Menu - {currentOrder?.customerName || "Walk-in"}
              </DialogTitle>
            </DialogHeader>

            {/* Search and Categories - More compact */}
            <div className="p-4 space-y-3 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className="h-8 text-xs"
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
                        className="whitespace-nowrap h-8 text-xs"
                      >
                        {category.name}
                      </Button>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Menu Items Grid - Improved layout */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                            <span className="font-bold text-primary text-sm">₱{item.price.toLocaleString()}</span>
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
              </div>
            </ScrollArea>
          </div>

          {/* Order Summary Section - Improved */}
          <div className="w-80 bg-white border-l flex flex-col">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Current Order
                </h3>
                <Badge variant="outline" className="text-xs">
                  {orderItems.length} items
                </Badge>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {orderItems.map((item) => (
                  <Card key={item.menuItemId} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-3">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2">{item.menuItem.name}</h4>
                            <p className="text-xs text-muted-foreground">₱{item.unitPrice.toLocaleString()} each</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromOrder(item.menuItemId)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
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
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-bold text-primary">₱{item.lineTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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

            {/* Order Totals and Actions - Improved */}
            <div className="p-4 bg-gray-50 border-t space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT (12%):</span>
                  <span>₱{tax.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">₱{total.toLocaleString()}</span>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
