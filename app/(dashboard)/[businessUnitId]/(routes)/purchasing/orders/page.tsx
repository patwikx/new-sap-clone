"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, ShoppingCart, CheckCircle, Clock, XCircle, Truck, Eye, FileText } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertModal } from "@/components/modals/alert-modal"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"


interface PurchaseOrder {
  id: string
  poNumber: string
  bpCode: string
  businessPartner: {
    name: string
  }
  documentDate: string
  postingDate: string
  deliveryDate: string
  status: string
  totalAmount: number
  amountReceived: number
  owner: {
    name: string
  }
  purchaseRequest?: {
    prNumber: string
  }
  items: {
    id: string
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
    openQuantity: number
    inventoryItem?: {
      name: string
    }
  }[]
  createdAt: string
}

const PurchaseOrdersPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Modal states
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const router = useRouter();

  // Fetch data
  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/purchase-orders`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setOrders(response.data)
    } catch (error) {
      toast.error("Failed to fetch purchase orders")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchOrders()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchOrders])

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.businessPartner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.owner.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    
    let matchesDate = true
    if (dateFilter !== "all") {
      const orderDate = new Date(order.documentDate)
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
      await axios.delete(`/api/${businessUnitId}/purchase-orders/${selectedOrder.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-order-id': selectedOrder.id // Added for consistency
        }
      })
      toast.success("Purchase order deleted successfully")
      setDeleteOrderOpen(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error) {
      toast.error("Failed to delete purchase order")
      console.error(error)
    }
  }

  const handleCloseOrder = async (order: PurchaseOrder) => {
    try {
      await axios.patch(`/api/${businessUnitId}/purchase-orders/${order.id}/close`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-order-id': order.id // Added for consistency
        }
      })
      toast.success("Purchase order closed successfully")
      fetchOrders()
    } catch (error) {
      toast.error("Failed to close purchase order")
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      OPEN: { variant: "default" as const, icon: Clock, label: "Open" },
      CLOSED: { variant: "secondary" as const, icon: CheckCircle, label: "Closed" },
      CANCELLED: { variant: "destructive" as const, icon: XCircle, label: "Cancelled" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.OPEN
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getReceiptProgress = (order: PurchaseOrder) => {
    const totalOrdered = order.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalReceived = order.items.reduce((sum, item) => sum + (item.quantity - item.openQuantity), 0)
    const percentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0
    
    return {
      percentage: Math.round(percentage),
      received: totalReceived,
      total: totalOrdered
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Manage purchase orders and vendor procurement
          </p>
        </div>
<Button onClick={() => router.push(`/${businessUnitId}/purchasing/orders/new`)} className="gap-2">
        <Plus className="h-4 w-4" />
        New Order
      </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'OPEN').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Receipt</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'OPEN' && o.amountReceived < o.totalAmount).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search purchase orders by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by PO number, vendor, or owner..."
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
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
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
          <CardTitle>Purchase Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            Manage your purchase orders and track delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const progress = getReceiptProgress(order)
              
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{order.poNumber}</p>
                        {getStatusBadge(order.status)}
                        {order.purchaseRequest && (
                          <Badge variant="outline" className="text-xs">
                            From {order.purchaseRequest.prNumber}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Vendor: {order.businessPartner.name} | 
                        Owner: {order.owner.name} | 
                        Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Amount: ₱{order.totalAmount.toLocaleString()}</span>
                        <span>Items: {order.items.length}</span>
                        <span>Receipt: {progress.received}/{progress.total} ({progress.percentage}%)</span>
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
                        onClick={() => router.push(`/${businessUnitId}/purchasing/orders/${order.id}`)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {order.status === 'OPEN' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => toast.info("Edit functionality coming soon")}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Order
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toast.info("Create goods receipt functionality coming soon")}
                            className="gap-2"
                          >
                            <Truck className="h-4 w-4" />
                            Create Receipt
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCloseOrder(order)}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Close Order
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {order.status !== 'CLOSED' && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedOrder(order)
                            setDeleteOrderOpen(true)
                          }}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Order
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No purchase orders found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first purchase order"}
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

export default PurchaseOrdersPage
