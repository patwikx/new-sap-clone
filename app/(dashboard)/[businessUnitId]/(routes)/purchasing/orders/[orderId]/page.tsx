"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ShoppingCart, 
  Edit, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle, 
  FileText, 
  Building2,
  Calendar,
  User,
  Package,
  Home,
  ChevronRight
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { toast } from "sonner"
import axios from "axios"

interface PurchaseOrder {
  id: string
  poNumber: string
  bpCode: string
  businessPartner: {
    name: string
    phone?: string
    email?: string
    contactPerson?: string
  }
  documentDate: string
  postingDate: string
  deliveryDate: string
  status: string
  totalAmount: number
  remarks?: string
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
    glAccount?: {
      accountCode: string
      name: string
    }
  }[]
  createdAt: string
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
  const orderId = params.orderId as string

  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`/api/${businessUnitId}/purchase-orders/${orderId}`, {
          headers: {
            'x-business-unit-id': businessUnitId,
            'x-order-id': orderId // Add this header
          },
        })
        setOrder(response.data)
      } catch (error) {
        toast.error("Failed to fetch purchase order")
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    if (businessUnitId && orderId) {
      fetchOrder()
    }
  }, [businessUnitId, orderId])

  const handleCloseOrder = async () => {
    if (!order) return
    
    try {
      await axios.patch(`/api/${businessUnitId}/purchase-orders/${order.id}/close`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-order-id': order.id
        }
      })
      toast.success("Purchase order closed successfully")
      setOrder({ ...order, status: 'CLOSED' })
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

  const getReceiptProgress = () => {
    if (!order) return { percentage: 0, received: 0, total: 0 }
    
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

  if (!order) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Purchase order not found</h3>
        <p className="text-muted-foreground">The requested purchase order could not be found.</p>
      </div>
    )
  }

  const progress = getReceiptProgress()

  return (
    <div className="min-h-screen w-full px-6 py-6">
      {/* Breadcrumbs */}
      <div className="mb-6">
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
              <BreadcrumbLink href={`/${businessUnitId}/purchasing`}>Purchasing</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/purchasing/orders`}>Purchase Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{order.poNumber}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{order.poNumber}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-muted-foreground">
              Purchase Order • Created {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'OPEN' && (
            <>
              <Button variant="outline" onClick={() => toast.info("Edit functionality coming soon")}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => toast.info("Create goods receipt functionality coming soon")}>
                <Truck className="h-4 w-4 mr-2" />
                Create Receipt
              </Button>
              <Button onClick={handleCloseOrder}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Close Order
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Vendor</span>
                  </div>
                  <p className="text-sm">{order.businessPartner.name}</p>
                  {order.businessPartner.contactPerson && (
                    <p className="text-xs text-muted-foreground">Contact: {order.businessPartner.contactPerson}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Owner</span>
                  </div>
                  <p className="text-sm">{order.owner.name}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Document Date</span>
                  </div>
                  <p className="text-sm">{new Date(order.documentDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Posting Date</span>
                  </div>
                  <p className="text-sm">{new Date(order.postingDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Delivery Date</span>
                  </div>
                  <p className="text-sm">{new Date(order.deliveryDate).toLocaleDateString()}</p>
                </div>
              </div>

              {order.remarks && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Remarks</span>
                    <p className="text-sm text-muted-foreground">{order.remarks}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>Items included in this purchase order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{item.description}</p>
                        {item.inventoryItem && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {item.inventoryItem.name}
                          </Badge>
                        )}
                        {item.glAccount && (
                          <p className="text-xs text-muted-foreground">
                            GL: {item.glAccount.accountCode} - {item.glAccount.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium">₱{item.lineTotal.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} × ₱{item.unitPrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Open: {item.openQuantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Total Amount</span>
                <span className="font-medium">₱{order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Items Count</span>
                <span className="font-medium">{order.items.length}</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Receipt Progress</span>
                  <span>{progress.percentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {progress.received} of {progress.total} items received
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Related Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Related Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.purchaseRequest && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Purchase Request</p>
                      <p className="text-xs text-muted-foreground">{order.purchaseRequest.prNumber}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              )}
              
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No goods receipts yet</p>
                {order.status === 'OPEN' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => router.push(`/${businessUnitId}/purchasing/receiving/new?po=${order.id}`)}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Create Receipt
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {order.status === 'OPEN' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => toast.info("Edit functionality coming soon")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Order
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleCloseOrder}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Close Order
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
