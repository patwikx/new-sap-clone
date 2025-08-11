"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Utensils,
  CreditCard,
  User,
  MapPin,
  ArrowLeft,
  Eye,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertModal } from "@/components/modals/alert-modal"
import { toast } from "sonner"
import axios from "axios"
import { useCurrentUser } from "@/lib/current-user"

interface Order {
  id: string
  orderNumber: string
  customerName?: string
  totalAmount: number
  status: string
  table?: {
    name: string
  }
  user: {
    name: string
  }
  businessPartner?: {
    name: string
  }
  items: {
    id: string
    quantity: number
    unitPrice: number
    lineTotal: number
    menuItem: {
      name: string
    }
  }[]
  payments: {
    id: string
    amount: number
    paymentMethod: {
      name: string
    }
  }[]
  createdAt: string
  paidAt?: string
}

const POSOrdersPage = () => {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
  const user = useCurrentUser()

  // Check authorization
  const isAuthorized = user?.role?.role === "Admin" || user?.role?.role === "Cashier"

  // State management
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("today")

  // Modal states
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Redirect if not authorized
  useEffect(() => {
    if (!isAuthorized) {
      router.push(`/${businessUnitId}/not-authorized`)
    }
  }, [isAuthorized, router, businessUnitId])

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/pos/orders`, {
        headers: { "x-business-unit-id": businessUnitId },
      })
      setOrders(response.data)
    } catch (error) {
      toast.error("Failed to fetch orders")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthorized) return

      setLoading(true)
      await fetchOrders()
      setLoading(false)
    }

    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchOrders, isAuthorized])

  // Filter orders - FIXED VERSION
  const filteredOrders = orders.filter((order) => {
    // Safe string matching with null checks
    const searchLower = searchTerm.toLowerCase()
    const orderNumber = order.orderNumber?.toLowerCase() || ""
    const customerName = order.customerName?.toLowerCase() || ""
    const businessPartnerName = order.businessPartner?.name?.toLowerCase() || ""
    const tableName = order.table?.name?.toLowerCase() || ""

    const matchesSearch =
      searchTerm === "" ||
      orderNumber.includes(searchLower) ||
      customerName.includes(searchLower) ||
      businessPartnerName.includes(searchLower) ||
      tableName.includes(searchLower)

    const matchesStatus = statusFilter === "all" || order.status === statusFilter

    let matchesDate = true
    if (dateFilter !== "all") {
      const orderDate = new Date(order.createdAt)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

      switch (dateFilter) {
        case "today":
          matchesDate = daysDiff === 0
          break
        case "week":
          matchesDate = daysDiff <= 7
          break
        case "month":
          matchesDate = daysDiff <= 30
          break
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  // Order actions
  const handleDeleteOrder = async () => {
    if (!selectedOrder) return

    try {
      await axios.delete(`/api/${businessUnitId}/pos/orders/${selectedOrder.id}`, {
        headers: { "x-business-unit-id": businessUnitId },
      })
      toast.success("Order cancelled successfully")
      setDeleteOrderOpen(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error) {
      toast.error("Failed to cancel order")
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: "outline" as const, icon: Clock, label: "Pending" },
      OPEN: { variant: "outline" as const, icon: Clock, label: "Open" },
      PREPARING: { variant: "secondary" as const, icon: Utensils, label: "Preparing" },
      KITCHEN: { variant: "secondary" as const, icon: Utensils, label: "In Kitchen" },
      READY: { variant: "default" as const, icon: CheckCircle, label: "Ready" },
      SERVED: { variant: "default" as const, icon: CheckCircle, label: "Served" },
      PAID: { variant: "default" as const, icon: CreditCard, label: "Paid" },
      CANCELLED: { variant: "destructive" as const, icon: XCircle, label: "Cancelled" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Calculate summary metrics - with safe filtering
  const totalOrders = orders.length
  const pendingOrders = orders.filter((o) => o.status === "PENDING" || o.status === "OPEN").length
  const kitchenOrders = orders.filter((o) => o.status === "KITCHEN" || o.status === "PREPARING").length
  const paidOrders = orders.filter((o) => o.status === "PAID").length
  const totalRevenue = orders.filter((o) => o.status === "PAID").reduce((sum, o) => sum + (o.totalAmount || 0), 0)

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/${businessUnitId}/pos`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to POS
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">POS Orders</h1>
            <p className="text-muted-foreground">View and manage point of sale orders</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Kitchen</CardTitle>
            <Utensils className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kitchenOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search POS orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, customer, or table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PREPARING">Preparing</SelectItem>
                <SelectItem value="KITCHEN">In Kitchen</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="SERVED">Served</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>Manage point of sale orders and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.orderNumber || order.id}</p>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {order.customerName || order.businessPartner?.name || "Walk-in"}
                      </div>
                      {order.table && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.table.name}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Items: {order.items?.length || 0}</span>
                      <span>Amount: ₱{(order.totalAmount || 0).toLocaleString()}</span>
                      <span>Server: {order.user?.name || "Unknown"}</span>
                      {order.paidAt && <span>Paid: {new Date(order.paidAt).toLocaleString()}</span>}
                    </div>
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
                      onClick={() => toast.info("View details functionality coming soon")}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {order.status !== "PAID" && order.status !== "CANCELLED" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedOrder(order)
                            setDeleteOrderOpen(true)
                          }}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Cancel Order
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No orders found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Orders will appear here when customers place them"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertModal
        isOpen={deleteOrderOpen}
        onClose={() => {
          setDeleteOrderOpen(false)
          setSelectedOrder(null)
        }}
        onConfirm={handleDeleteOrder}
        loading={false}
      />
    </div>
  )
}

export default POSOrdersPage
