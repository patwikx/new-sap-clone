"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, ClipboardList, CheckCircle, Clock, XCircle, AlertTriangle, Eye } from "lucide-react"
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
    inventoryItem?: {
      name: string
    }
    uom: {
      symbol: string
    }
  }[]
  createdAt: string
}

const PurchaseRequestsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  // Modal states
  const [deleteRequestOpen, setDeleteRequestOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)
  const router = useRouter();

  // Fetch data
  const fetchRequests = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/purchase-requests`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setRequests(response.data)
    } catch (error) {
      toast.error("Failed to fetch purchase requests")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchRequests()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchRequests])

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          request.requestor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          request.items.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  // Request actions
  const handleDeleteRequest = async () => {
    if (!selectedRequest) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/purchase-requests/${selectedRequest.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-request-id': selectedRequest.id // Added for consistency
        }
      })
      toast.success("Purchase request deleted successfully")
      setDeleteRequestOpen(false)
      setSelectedRequest(null)
      fetchRequests()
    } catch (error) {
      toast.error("Failed to delete purchase request")
      console.error(error)
    }
  }

  const handleApproveRequest = async (request: PurchaseRequest) => {
    try {
      await axios.patch(`/api/${businessUnitId}/purchase-requests/${request.id}/approve`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-request-id': request.id // Added header to fix server error
        }
      })
      toast.success("Purchase request approved successfully")
      fetchRequests()
    } catch (error) {
      toast.error("Failed to approve purchase request")
      console.error(error)
    }
  }

  const handleRejectRequest = async (request: PurchaseRequest) => {
    try {
      await axios.patch(`/api/${businessUnitId}/purchase-requests/${request.id}/reject`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-request-id': request.id // Added header to fix server error
        }
      })
      toast.success("Purchase request rejected")
      fetchRequests()
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Requests</h1>
          <p className="text-muted-foreground">
            Create and manage purchase requests for procurement approval
          </p>
        </div>
 <Button onClick={() => router.push(`/${businessUnitId}/purchasing/requests/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'PENDING').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'APPROVED').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'REJECTED').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.priority === 'URGENT').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search purchase requests by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by PR number, requestor, or item description..."
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
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="PARTIALLY_ORDERED">Partially Ordered</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Requests ({filteredRequests.length})</CardTitle>
          <CardDescription>
            Manage purchase requests and their approval workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.prNumber}</p>
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested by: {request.requestor.name} | 
                      Required: {new Date(request.requiredDate).toLocaleDateString()} | 
                      Items: {request.items.length} | 
                      Est. Amount: ₱{request.totalEstimatedAmount.toLocaleString()}
                    </p>
                    {request.justification && (
                      <p className="text-xs text-muted-foreground max-w-md truncate">
                        {request.justification}
                      </p>
                    )}
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
                      onClick={() => router.push(`/${businessUnitId}/purchasing/requests/${request.id}`)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {request.status === 'PENDING' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => toast.info("Edit functionality coming soon")}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Request
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleApproveRequest(request)}
                          className="gap-2 text-green-600"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRejectRequest(request)}
                          className="gap-2 text-red-600"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </DropdownMenuItem>
                      </>
                    )}
                    {request.status === 'APPROVED' && (
                      <DropdownMenuItem
                        onClick={() => toast.info("Create PO functionality coming soon")}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create PO
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {request.status === 'PENDING' && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedRequest(request)
                          setDeleteRequestOpen(true)
                        }}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Request
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No purchase requests found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first purchase request"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertModal
        isOpen={deleteRequestOpen}
        onClose={() => {
          setDeleteRequestOpen(false)
          setSelectedRequest(null)
        }}
        onConfirm={handleDeleteRequest}
        loading={false}
      />
    </div>
  )
}

export default PurchaseRequestsPage
