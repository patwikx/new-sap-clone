"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, ClipboardList, CheckCircle, Clock, XCircle, Eye, MapPin } from "lucide-react"
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

// Corrected interface to match the Prisma schema
interface StockRequisition {
  id: string
  requisitionNumber: string
  status: string
  notes?: string | null
  fromLocation: {
    name: string
  }
  toLocation: {
    name: string
  }
  requestor: {
    name: string
  }
  approver?: {
    name: string
  } | null
  items: {
    id: string
    requestedQuantity: number
    fulfilledQuantity: number | null
    inventoryItem: {
      name: string
      itemCode: string | null
      uom: {
        symbol: string
      }
    }
  }[]
  createdAt: string // This field exists
  fulfilledAt?: string | null // This field exists
}

const StockRequisitionsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const router = useRouter()

  // State management
  const [requisitions, setRequisitions] = useState<StockRequisition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Modal states
  const [deleteRequisitionOpen, setDeleteRequisitionOpen] = useState(false)
  const [selectedRequisition, setSelectedRequisition] = useState<StockRequisition | null>(null)

  // Fetch data
  const fetchRequisitions = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/stock-requisitions`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setRequisitions(response.data)
    } catch (error) {
      toast.error("Failed to fetch stock requisitions")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchRequisitions()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchRequisitions])

  // Filter requisitions
  const filteredRequisitions = requisitions.filter(requisition => {
    const matchesSearch = requisition.requisitionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          requisition.requestor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          requisition.fromLocation?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          requisition.toLocation?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || requisition.status === statusFilter
    
    let matchesDate = true
    if (dateFilter !== "all") {
      const reqDate = new Date(requisition.createdAt) // Use createdAt as per schema
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24))
      
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

  // Calculate metrics
  const totalRequisitions = requisitions.length
  const pendingCount = requisitions.filter(r => r.status === 'PENDING').length
  const approvedCount = requisitions.filter(r => r.status === 'APPROVED').length
  const fulfilledCount = requisitions.filter(r => r.status === 'FULFILLED').length

  // Requisition actions
  const handleDeleteRequisition = async () => {
    if (!selectedRequisition) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/stock-requisitions/${selectedRequisition.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Stock requisition deleted successfully")
      setDeleteRequisitionOpen(false)
      setSelectedRequisition(null)
      fetchRequisitions()
    } catch (error) {
      toast.error("Failed to delete stock requisition")
      console.error(error)
    }
  }

  const handleApproveRequisition = async (requisition: StockRequisition) => {
    try {
      await axios.patch(`/api/${businessUnitId}/stock-requisitions/${requisition.id}/approve`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Stock requisition approved successfully")
      fetchRequisitions()
    } catch (error) {
      toast.error("Failed to approve stock requisition")
      console.error(error)
    }
  }

  const handleFulfillRequisition = async (requisition: StockRequisition) => {
    try {
      await axios.patch(`/api/${businessUnitId}/stock-requisitions/${requisition.id}/fulfill`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Stock requisition fulfilled successfully")
      fetchRequisitions()
    } catch (error) {
      toast.error("Failed to fulfill stock requisition")
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: "outline" as const, icon: Clock, label: "Pending" },
      APPROVED: { variant: "default" as const, icon: CheckCircle, label: "Approved" },
      FULFILLED: { variant: "secondary" as const, icon: CheckCircle, label: "Fulfilled" },
      REJECTED: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
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
          <h1 className="text-3xl font-bold tracking-tight">Stock Requisitions</h1>
          <p className="text-muted-foreground">
            Manage inventory transfers between locations
          </p>
        </div>
        <Button onClick={() => router.push(`/${businessUnitId}/inventory/requisitions/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Requisition
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requisitions</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequisitions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfilled</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fulfilledCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter and search stock requisitions by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by requisition number, requestor, or location..."
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
                <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
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

      {/* Requisitions List */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Requisitions ({filteredRequisitions.length})</CardTitle>
          <CardDescription>
            Track inventory transfer requests and their fulfillment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequisitions.map((requisition) => (
              <div
                key={requisition.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{requisition.requisitionNumber}</h3>
                      {getStatusBadge(requisition.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Requestor: {requisition.requestor?.name}</span>
                      <span>Items: {requisition.items.length}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">From:</span>
                        <span className="font-medium">{requisition.fromLocation?.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">To:</span>
                        <span className="font-medium">{requisition.toLocation?.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        Created: {new Date(requisition.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {requisition.items.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {requisition.items.slice(0, 3).map((item) => (
                          <Badge key={item.id} variant="outline" className="text-xs">
                            {item.inventoryItem.itemCode}: {item.requestedQuantity} {item.inventoryItem.uom.symbol}
                          </Badge>
                        ))}
                        {requisition.items.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{requisition.items.length - 3} more
                          </Badge>
                        )}
                      </div>
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
                      onClick={() => toast.info("View details functionality coming soon")}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {requisition.status === 'PENDING' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => toast.info("Edit functionality coming soon")}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Requisition
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleApproveRequisition(requisition)}
                          className="gap-2 text-green-600"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                      </>
                    )}
                    {requisition.status === 'APPROVED' && (
                      <DropdownMenuItem
                        onClick={() => handleFulfillRequisition(requisition)}
                        className="gap-2 text-blue-600"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Fulfill
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {requisition.status === 'PENDING' && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedRequisition(requisition)
                          setDeleteRequisitionOpen(true)
                        }}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Requisition
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredRequisitions.length === 0 && (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No stock requisitions found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first stock requisition"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertModal
        isOpen={deleteRequisitionOpen}
        onClose={() => {
          setDeleteRequisitionOpen(false)
          setSelectedRequisition(null)
        }}
        onConfirm={handleDeleteRequisition}
        loading={false}
      />
    </div>
  )
}

export default StockRequisitionsPage
