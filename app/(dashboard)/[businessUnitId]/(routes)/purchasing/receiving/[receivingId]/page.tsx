"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Truck, 
  CheckCircle, 
  Building2,
  Calendar,
  User,
  Package,
  Home,
  ChevronRight,
  FileText,
  MapPin
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

interface GoodsReceipt {
  id: string
  docNum: string
  documentDate: string
  postingDate: string
  deliveryNote?: string
  remarks?: string
  basePurchaseOrder: {
    poNumber: string
    businessPartner: {
      name: string
      phone?: string
      email?: string
    }
  } | null // Can be null
  receivedBy: {
    name: string
  } | null // Can be null
  items: {
    id: string
    quantity: number
    batchNumber?: string
    expiryDate?: string
    notes?: string
    inventoryItem?: {
      name: string
    }
    inventoryLocation: {
      name: string
    }
    purchaseOrderItem: {
      description: string
      unitPrice: number
    } | null // Can be null
  }[]
  totalQuantity: number
  totalValue: number
  createdAt: string
}

export default function GoodsReceiptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
  const receivingId = params.receivingId as string

  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReceipt = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/goods-receipts/${receivingId}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-receipt-id': receivingId // Add the required header
        },
      })
      setReceipt(response.data)
    } catch (error) {
      toast.error("Failed to fetch goods receipt")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [businessUnitId, receivingId])

  useEffect(() => {
    if (businessUnitId && receivingId) {
      fetchReceipt()
    }
  }, [businessUnitId, receivingId, fetchReceipt])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="text-center py-12">
        <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Goods receipt not found</h3>
        <p className="text-muted-foreground">The requested goods receipt could not be found.</p>
      </div>
    )
  }

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
              <BreadcrumbLink href={`/${businessUnitId}/purchasing/receiving`}>Goods Receipt</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{receipt.docNum}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{receipt.docNum}</h1>
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Received
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Goods Receipt • Created {new Date(receipt.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => toast.info("Print functionality coming soon")}>
            <FileText className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Receipt Details */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Vendor</span>
                  </div>
                  <p className="text-sm">{receipt.basePurchaseOrder?.businessPartner?.name}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Received By</span>
                  </div>
                  <p className="text-sm">{receipt.receivedBy?.name}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Document Date</span>
                  </div>
                  <p className="text-sm">{new Date(receipt.documentDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Posting Date</span>
                  </div>
                  <p className="text-sm">{new Date(receipt.postingDate).toLocaleDateString()}</p>
                </div>
                {receipt.deliveryNote && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Delivery Note</span>
                    </div>
                    <p className="text-sm">{receipt.deliveryNote}</p>
                  </div>
                )}
              </div>

              {receipt.remarks && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Remarks</span>
                    <p className="text-sm text-muted-foreground">{receipt.remarks}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Received Items */}
          <Card>
            <CardHeader>
              <CardTitle>Received Items</CardTitle>
              <CardDescription>Items received in this goods receipt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {receipt.items.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{item.purchaseOrderItem?.description}</p>
                        {item.inventoryItem && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {item.inventoryItem.name}
                          </Badge>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.inventoryLocation?.name}
                          </div>
                          {item.batchNumber && (
                            <span>Batch: {item.batchNumber}</span>
                          )}
                          {item.expiryDate && (
                            <span>Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium">Qty: {item.quantity}</p>
                      <p className="text-sm text-muted-foreground">
                        Value: ₱{(Number(item.quantity) * (item.purchaseOrderItem?.unitPrice || 0)).toLocaleString()}
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
              <CardTitle>Receipt Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Total Value</span>
                <span className="font-medium">₱{receipt.totalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Quantity</span>
                <span className="font-medium">{receipt.totalQuantity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Items Count</span>
                <span className="font-medium">{receipt.items.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Related Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Related Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Purchase Order</p>
                    <p className="text-xs text-muted-foreground">{receipt.basePurchaseOrder?.poNumber}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/${businessUnitId}/purchasing/orders/${receipt.basePurchaseOrder?.poNumber}`)}>
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
