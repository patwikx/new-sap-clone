"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  ShoppingCart,
  User,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertModal } from "@/components/modals/alert-modal"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { EditSalesQuotationModal } from "./components/edit-sales-quotation-modal"

interface SalesQuotation {
  id: string
  docNum: string
  bpCode: string
  businessPartner: {
    name: string
  }
  validUntil: string
  documentDate: string
  postingDate: string
  status: string
  totalAmount: number
  owner: {
    name: string
  }
  items: {
    id: string
    menuItemId: string
    quantity: number
    unitPrice: number
    description: string
    menuItem: {
      name: string
    }
  }[]
  createdAt: string
}

const SalesQuotationsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const router = useRouter()

  // State management
  const [quotations, setQuotations] = useState<SalesQuotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Modal states
  const [editQuotationOpen, setEditQuotationOpen] = useState(false)
  const [deleteQuotationOpen, setDeleteQuotationOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<SalesQuotation | null>(null)

  // Fetch data
  const fetchQuotations = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/sales-quotations`, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      setQuotations(response.data)
    } catch (error) {
      toast.error("Failed to fetch sales quotations")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchQuotations()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchQuotations])

  // Filter quotations
  const filteredQuotations = quotations.filter((quotation) => {
    const matchesSearch =
      quotation.docNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.businessPartner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.owner.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || quotation.status === statusFilter

    let matchesDate = true
    if (dateFilter !== "all") {
      const quotationDate = new Date(quotation.createdAt)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - quotationDate.getTime()) / (1000 * 60 * 60 * 24))

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

  // Quotation actions
  const handleDeleteQuotation = async () => {
    if (!selectedQuotation) return

    try {
      await axios.delete(`/api/${businessUnitId}/sales-quotations/${selectedQuotation.id}`, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      toast.success("Sales quotation deleted successfully")
      setDeleteQuotationOpen(false)
      setSelectedQuotation(null)
      fetchQuotations()
    } catch (error) {
      toast.error("Failed to delete sales quotation")
      console.error(error)
    }
  }

  const handleConvertToOrder = async (quotation: SalesQuotation) => {
    try {
      await axios.post(
        `/api/${businessUnitId}/sales-orders/from-quotation`,
        {
          quotationId: quotation.id,
        },
        {
          headers: {
            "x-business-unit-id": businessUnitId,
          },
        },
      )
      toast.success("Sales order created from quotation")
      fetchQuotations()
    } catch (error) {
      toast.error("Failed to convert quotation to order")
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      OPEN: { variant: "default" as const, icon: Clock, label: "Open" },
      ACCEPTED: { variant: "default" as const, icon: CheckCircle, label: "Accepted" },
      REJECTED: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
      EXPIRED: { variant: "secondary" as const, icon: Clock, label: "Expired" },
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
          <h1 className="text-3xl font-bold tracking-tight">Sales Quotations</h1>
          <p className="text-muted-foreground">Create and manage sales quotations for customer pricing</p>
        </div>
        <Button onClick={() => router.push(`/${businessUnitId}/sales/quotations/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Quotation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Quotations</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotations.filter((q) => q.status === "OPEN").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{quotations.reduce((sum, q) => sum + q.totalAmount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotations.filter((q) => q.status === "ACCEPTED").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter and search sales quotations by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by quotation number, customer, or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
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

      {/* Quotations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredQuotations.length > 0 ? (
          filteredQuotations.map((quotation) => (
            <Card key={quotation.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{quotation.docNum}</CardTitle>
                    <CardDescription className="pt-1">{quotation.businessPartner.name}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push(`/${businessUnitId}/sales/quotations/${quotation.id}`)} className="gap-2">
                        <Eye className="h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      {quotation.status === "OPEN" && (
                        <>
                          <DropdownMenuItem onClick={() => { setSelectedQuotation(quotation); setEditQuotationOpen(true); }} className="gap-2">
                            <Edit className="h-4 w-4" /> Edit Quotation
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConvertToOrder(quotation)} className="gap-2">
                            <ShoppingCart className="h-4 w-4" /> Convert to Order
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {quotation.status !== "ACCEPTED" && (
                        <DropdownMenuItem onClick={() => { setSelectedQuotation(quotation); setDeleteQuotationOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                          <Trash2 className="h-4 w-4" /> Delete Quotation
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3 text-sm">
                  {getStatusBadge(quotation.status)}
                  <div className="text-muted-foreground space-y-2 border-t pt-3">
                      <div className="flex items-center gap-2">
                          <User className="h-4 w-4"/>
                          <span>Owner: <strong>{quotation.owner.name}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4"/>
                          <span>Valid Until: <strong>{new Date(quotation.validUntil).toLocaleDateString()}</strong></span>
                      </div>
                  </div>
              </CardContent>
              <CardFooter className="bg-muted/50 py-2 px-4 border-t">
                <div className="flex justify-between items-center w-full">
                    <span className="text-xs text-muted-foreground">Total Amount</span>
                    <span className="font-bold text-base">₱{quotation.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="lg:col-span-2 xl:col-span-3 text-center py-16 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No sales quotations found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first sales quotation"}
            </p>
          </div>
        )}
      </div>

      <EditSalesQuotationModal
        isOpen={editQuotationOpen}
        onClose={() => {
          setEditQuotationOpen(false)
          setSelectedQuotation(null)
        }}
        onSuccess={() => {
          fetchQuotations()
          setEditQuotationOpen(false)
          setSelectedQuotation(null)
        }}
        quotation={selectedQuotation}
      />

      <AlertModal
        isOpen={deleteQuotationOpen}
        onClose={() => {
          setDeleteQuotationOpen(false)
          setSelectedQuotation(null)
        }}
        onConfirm={handleDeleteQuotation}
        loading={false}
      />
    </div>
  )
}

export default SalesQuotationsPage
