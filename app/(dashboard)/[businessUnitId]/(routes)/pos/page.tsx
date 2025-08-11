"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Store, Users, Clock, CheckCircle, Receipt, CreditCard, User, MapPin, RefreshCw, Table2Icon, TableIcon } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import { useCurrentUser } from "@/lib/current-user"
import { OrderCard } from "./components/order-card"
import { SettlementDialog } from "./components/settlement-dialog"
import { CustomerDialog } from "./components/customer-dialog"
import type { Table, MenuItem, MenuCategory, ExistingOrder } from "@/types/pos"

const POSPage = () => {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
  const user = useCurrentUser()

  // Check authorization
  const isAuthorized = user?.role?.role === "Admin" || user?.role?.role === "Cashier"

  // State management
  const [tables, setTables] = useState<Table[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [currentOrder, setCurrentOrder] = useState<ExistingOrder | null>(null)

  // Modal states
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)

  // Redirect if not authorized
  useEffect(() => {
    if (!isAuthorized) {
      router.push(`/${businessUnitId}/not-authorized`)
    }
  }, [isAuthorized, router, businessUnitId])

  // Fetch data
  const fetchTables = useCallback(async () => {
    try {
      const response = await axios.get<Table[]>(`/api/${businessUnitId}/pos/tables`, {
        headers: { "x-business-unit-id": businessUnitId },
      })
      setTables(response.data)
    } catch (error) {
      toast.error("Failed to fetch tables")
      console.error(error)
    }
  }, [businessUnitId])

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

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthorized) return

      setLoading(true)
      await Promise.all([fetchTables(), fetchMenuData()])
      setLoading(false)
    }

    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchTables, fetchMenuData, isAuthorized])

  // Auto-refresh tables every 30 seconds
  useEffect(() => {
    if (!isAuthorized) return

    const interval = setInterval(() => {
      fetchTables()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchTables, isAuthorized])

  // Table actions
  const handleTableClick = (table: Table) => {
    setSelectedTable(table)

    if (table.status === "AVAILABLE") {
      setCustomerDialogOpen(true)
    } else if (table.currentOrder) {
      // Since table.currentOrder is always ExistingOrder from the API, we can safely cast it
      setCurrentOrder(table.currentOrder)
    }
  }

  const handleStartOrder = (customerName: string, customerId?: string, serverId?: string) => {
    setCustomerDialogOpen(false)

    if (selectedTable) {
      // Navigate to new order page with table, customer, and server info
      const params = new URLSearchParams({
        tableId: selectedTable.id,
        customerName: customerName,
      })

      if (customerId) {
        params.append("customerId", customerId)
      }

      if (serverId) {
        params.append("serverId", serverId)
      }

      router.push(`/${businessUnitId}/pos/new-order?${params.toString()}`)
    }
  }

  const handleOrderUpdate = (updatedOrder: ExistingOrder) => {
    setCurrentOrder(updatedOrder)
    fetchTables() // Refresh tables to show updated status
  }

  const handleSettlement = () => {
    if (selectedTable?.currentOrder) {
      setSettlementDialogOpen(true)
    }
  }

  const handleSettlementComplete = () => {
    setSettlementDialogOpen(false)
    setSelectedTable(null)
    setCurrentOrder(null)
    fetchTables()
  }

  const getTableStatusBadge = (status: string) => {
    const statusConfig = {
      AVAILABLE: { variant: "default" as const, icon: CheckCircle, label: "Available", color: "text-green-600" },
      OCCUPIED: { variant: "destructive" as const, icon: Users, label: "Occupied", color: "text-red-600" },
      RESERVED: { variant: "secondary" as const, icon: Clock, label: "Reserved", color: "text-yellow-600" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.AVAILABLE
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getTableCardClass = (table: Table) => {
    const baseClass = "p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md"

    switch (table.status) {
      case "AVAILABLE":
        return `${baseClass} border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:hover:border-green-700 dark:hover:bg-green-900`
      case "OCCUPIED":
        return `${baseClass} border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:hover:border-red-700 dark:hover:bg-red-900`
      case "RESERVED":
        return `${baseClass} border-yellow-200 bg-yellow-50 hover:border-yellow-300 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950 dark:hover:border-yellow-700 dark:hover:bg-yellow-900`
      default:
        return `${baseClass} border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800`
    }
  }

  // Calculate summary metrics
  const totalTables = tables.length
  const availableTables = tables.filter((t) => t.status === "AVAILABLE").length
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED").length
  const reservedTables = tables.filter((t) => t.status === "RESERVED").length
  const totalRevenue = tables.reduce((sum, t) => {
    if (t.currentOrder) {
      return (
        sum +
        (typeof t.currentOrder.totalAmount === "number"
          ? t.currentOrder.totalAmount
          : Number(t.currentOrder.totalAmount))
      )
    }
    return sum
  }, 0)

  if (!isAuthorized) {
    return null // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="  border-b  px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Point of Sale</h1>
            </div>
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {user?.name}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={fetchTables} className="gap-2 bg-transparent">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => router.push(`/${businessUnitId}/pos/orders`)} className="gap-2">
              <Receipt className="h-4 w-4" />
              View Orders
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4 mt-4">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tables</p>
                <p className="text-2xl font-bold">{totalTables}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{availableTables}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{occupiedTables}</p>
              </div>
              <Users className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reserved</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{reservedTables}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">₱{totalRevenue.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tables Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {tables.map((table) => (
              <div key={table.id} className={getTableCardClass(table)} onClick={() => handleTableClick(table)}>
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-white dark:bg-gray-700 shadow-sm">
                    <TableIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{table.name}</h3>
                    {getTableStatusBadge(table.status)}
                  </div>
                  {table.currentOrder && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{table.currentOrder.customerName || "Walk-in"}</p>
                      <p className="text-sm font-medium">
                        ₱
                        {(typeof table.currentOrder.totalAmount === "number"
                          ? table.currentOrder.totalAmount
                          : Number(table.currentOrder.totalAmount)
                        ).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{table.currentOrder.items.length} items</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Panel */}
        <div className="w-96  border-l flex flex-col">
          {selectedTable ? (
            <OrderCard
              table={selectedTable}
              order={currentOrder}
              onEditOrder={() => {
                if (selectedTable.currentOrder) {
                  router.push(
                    `/${businessUnitId}/pos/new-order?tableId=${selectedTable.id}&orderId=${selectedTable.currentOrder.id}`,
                  )
                }
              }}
              onSendToKitchen={async () => {
                try {
                  if (currentOrder && currentOrder.id) {
                    await axios.patch(
                      `/api/${businessUnitId}/pos/orders/${currentOrder.id}/send-kitchen`,
                      {},
                      {
                        headers: { "x-business-unit-id": businessUnitId },
                      },
                    )
                    toast.success("Order sent to kitchen")
                    fetchTables()
                  }
                } catch (error) {
                  toast.error("Failed to send order to kitchen")
                  console.error(error)
                }
              }}
              onSettlement={() => setSettlementDialogOpen(true)}
              onRefresh={fetchTables}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Select a Table</h3>
                  <p className="text-sm text-muted-foreground">Click on a table to start taking orders</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CustomerDialog
        isOpen={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        onConfirm={handleStartOrder}
        table={selectedTable}
        businessUnitId={businessUnitId}
      />

      <SettlementDialog
        isOpen={settlementDialogOpen}
        onClose={() => setSettlementDialogOpen(false)}
        order={selectedTable?.currentOrder}
        onComplete={handleSettlementComplete}
        businessUnitId={businessUnitId}
      />
    </div>
  )
}

export default POSPage
