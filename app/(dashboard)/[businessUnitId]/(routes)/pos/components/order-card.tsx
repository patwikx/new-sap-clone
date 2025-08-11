"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Edit, Send, CreditCard, Clock, User, Utensils, CheckCircle, type LucideIcon } from "lucide-react"
import type { Table, ExistingOrder, OrderItem } from "@/types/pos"

interface OrderCardProps {
  table: Table
  order: ExistingOrder | null
  onEditOrder: () => void
  onSendToKitchen: () => void
  onSettlement: () => void
  onRefresh: () => void
}

type OrderStatus = "PENDING" | "KITCHEN" | "READY" | "SERVED" | "OPEN" | "PREPARING"

interface StatusConfig {
  variant: "outline" | "secondary" | "default"
  icon: LucideIcon
  label: string
}

export const OrderCard = ({ table, order, onEditOrder, onSendToKitchen, onSettlement, onRefresh }: OrderCardProps) => {
  if (!table.currentOrder && !order) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Utensils className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">No Active Order</h3>
            <p className="text-sm text-muted-foreground">Table {table.name} is available</p>
          </div>
        </div>
      </div>
    )
  }

  const currentOrder = table.currentOrder || order
  if (!currentOrder) return null

  // Calculate totals with proper type checking
  const subtotal =
    currentOrder.items?.reduce((sum: number, item: OrderItem) => {
      const lineTotal = typeof item.lineTotal === "number" ? item.lineTotal : Number(item.lineTotal) || 0
      return sum + lineTotal
    }, 0) || 0

  const tax = subtotal * 0.12
  const total = subtotal + tax

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<OrderStatus, StatusConfig> = {
      PENDING: { variant: "outline", icon: Clock, label: "Pending" },
      OPEN: { variant: "outline", icon: Clock, label: "Open" },
      KITCHEN: { variant: "secondary", icon: Utensils, label: "In Kitchen" },
      PREPARING: { variant: "secondary", icon: Utensils, label: "Preparing" },
      READY: { variant: "default", icon: CheckCircle, label: "Ready" },
      SERVED: { variant: "default", icon: CheckCircle, label: "Served" },
    }

    const config = statusConfig[status as OrderStatus] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Table {table.name}</h3>
              <p className="text-sm text-muted-foreground">Order #{currentOrder.id}</p>
            </div>
            {getStatusBadge(currentOrder.status)}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{currentOrder.customerName || "Walk-in"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(currentOrder.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="flex-1 min-h-0 max-h-96">
        <ScrollArea className="h-full p-4">
          <div className="space-y-2">
            {currentOrder.items?.map((item: OrderItem, index: number) => (
              <div key={item.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-md p-2 border">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs leading-tight">{item.menuItemName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.priceAtSale)}
                    </p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        Modifiers: {item.modifiers.map((mod) => mod.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-2">
                    <span className="font-bold text-xs">{formatCurrency(item.lineTotal)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Totals and Actions */}
      <div className="p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700 space-y-4">
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
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Button onClick={onEditOrder} variant="outline" className="w-full gap-2 bg-transparent">
            <Edit className="h-4 w-4" />
            Edit Order
          </Button>
          {(currentOrder.status === "PENDING" || currentOrder.status === "OPEN") && (
            <Button onClick={onSendToKitchen} className="w-full gap-2">
              <Send className="h-4 w-4" />
              Send to Kitchen
            </Button>
          )}
          {(currentOrder.status === "READY" ||
            currentOrder.status === "SERVED" ||
            currentOrder.status === "PREPARING") && (
            <Button onClick={onSettlement} className="w-full gap-2" variant="default">
              <CreditCard className="h-4 w-4" />
              Settle Payment
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
