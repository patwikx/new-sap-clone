"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ClipboardList, 
  Edit, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Calendar,
  User,
  Package,
  Home,
  ChevronRight,
  ShoppingCart
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

interface PurchaseRequest {
  id: string
  prNumber: string
  requestDate: string
  requiredDate: string
  priority: string
  status: string
  justification?: string
  totalEstimatedAmount: number
  requestor: {
    name: string
  }
  approver?: {
    name: string
  }
  items: {
    id: string
    description: string
    requestedQuantity: number
    estimatedPrice?: number
    notes?: string
    inventoryItem?: {
      name: string
    }
    uom: {
      symbol: string
    }
  }[]
  createdAt: string
}

export default function PurchaseRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
  const requestId = params.requestId as string

  const [request, setRequest] = useState<PurchaseRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await axios.get(`/api/${businessUnitId}/purchase-requests/${requestId}`, {
          headers: {
            'x-business-unit-id': businessUnitId,
            'x-request-id': requestId // Add this header
          },
        })
        setRequest(response.data)
      } catch (error) {
        toast.error("Failed to fetch purchase request")
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    if (businessUnitId && requestId) {
      fetchRequest()
    }
  }, [businessUnitId, requestId])

  const handleApproveRequest = async () => {
    if (!request) return
    
    try {
      await axios.patch(`/api/${businessUnitId}/purchase-requests/${request.id}/approve`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-request-id': request.id
        }
      })
      toast.success("Purchase request approved successfully")
      setRequest({ ...request, status: 'APPROVED' })
    } catch (error) {
      toast.error("Failed to approve purchase request")
      console.error(error)
    }
  }

  const handleRejectRequest = async () => {
    if (!request) return
    
    try {
      await axios.patch(`/api/${businessUnitId}/purchase-requests/${request.id}/reject`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-request-id': request.id
        }
      })
      toast.success("Purchase request rejected")
      setRequest({ ...request, status: 'REJECTED' })
    } catch (error) {
      toast.error("Failed to reject purchase request")
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: "outline" as const, icon: Clock, label: "Pending" },
      APPROVED: { variant: "default" as const, icon: CheckCircle, label: "Approved" },
      REJECTED: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
      PARTIALLY_ORDERED: { variant: "secondary" as const, icon: AlertTriangle, label: "Partially Ordered" },
      COMPLETED: { variant: "default" as const, icon: CheckCircle, label: "Completed" },
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

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "LOW": "outline",
      "MEDIUM": "secondary",
      "HIGH": "default",
      "URGENT": "destructive",
    }
    return (
      <Badge variant={variants[priority] || "outline"} className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {priority}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Purchase request not found</h3>
        <p className="text-muted-foreground">The requested purchase request could not be found.</p>
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
              <BreadcrumbLink href={`/${businessUnitId}/purchasing/requests`}>Purchase Requests</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{request.prNumber}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{request.prNumber}</h1>
              {getStatusBadge(request.status)}
              {getPriorityBadge(request.priority)}
            </div>
            <p className="text-muted-foreground">
              Purchase Request • Created {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {request.status === 'PENDING' && (
            <>
              <Button variant="outline" onClick={() => toast.info("Edit functionality coming soon")}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={handleRejectRequest}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={handleApproveRequest}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          {request.status === 'APPROVED' && (
            <Button onClick={() => router.push(`/${businessUnitId}/purchasing/orders/new?pr=${request.id}`)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create PO
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Requestor</span>
                  </div>
                  <p className="text-sm">{request.requestor.name}</p>
                </div>
                {request.approver && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Approver</span>
                    </div>
                    <p className="text-sm">{request.approver.name}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Request Date</span>
                  </div>
                  <p className="text-sm">{new Date(request.requestDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Required Date</span>
                  </div>
                  <p className="text-sm">{new Date(request.requiredDate).toLocaleDateString()}</p>
                </div>
              </div>

              {request.justification && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Justification</span>
                    <p className="text-sm text-muted-foreground">{request.justification}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Request Items */}
          <Card>
            <CardHeader>
              <CardTitle>Requested Items</CardTitle>
              <CardDescription>Items included in this purchase request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.items.map((item, index) => (
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
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium">
                        {item.requestedQuantity} {item.uom.symbol}
                      </p>
                      {item.estimatedPrice && (
                        <p className="text-sm text-muted-foreground">
                          Est. ₱{(item.estimatedPrice * item.requestedQuantity).toLocaleString()}
                        </p>
                      )}
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
              <CardTitle>Request Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Total Estimated</span>
                <span className="font-medium">₱{request.totalEstimatedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Items Count</span>
                <span className="font-medium">{request.items.length}</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <span className="text-sm font-medium">Priority Level</span>
                {getPriorityBadge(request.priority)}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {request.status === 'PENDING' && (
            <Card>
              <CardHeader>
                <CardTitle>Approval Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" onClick={handleApproveRequest}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Request
                </Button>
                <Button variant="destructive" className="w-full justify-start" onClick={handleRejectRequest}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Request
                </Button>
                <Separator />
                <Button variant="outline" className="w-full justify-start" onClick={() => toast.info("Edit functionality coming soon")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Request
                </Button>
              </CardContent>
            </Card>
          )}

          {request.status === 'APPROVED' && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full justify-start" onClick={() => router.push(`/${businessUnitId}/purchasing/orders/new?pr=${request.id}`)}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
