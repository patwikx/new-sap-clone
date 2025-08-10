"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  CreditCard,
  AlertTriangle,
} from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertModal } from "@/components/modals/alert-modal"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"


interface ARInvoice {
  id: string
  docNum: string
  documentDate: string
  postingDate: string
  dueDate: string
  status: string
  settlementStatus: string
  totalAmount: number
  amountPaid: number
  businessPartner: {
    name: string
  }
  baseDelivery?: {
    docNum: string
    baseSalesOrder?: {
      docNum: string // Changed from soNumber
    }
  }
  items: {
    id: string
    quantity: number
    unitPrice: number
    lineTotal: number
    description: string
    menuItem: {
      name: string
    }
    glAccount: {
      name: string
      accountCode: string
    }
  }[]
  createdAt: string
}

const ARInvoicesPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const router = useRouter()

  // State management
  const [invoices, setInvoices] = useState<ARInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [settlementFilter, setSettlementFilter] = useState<string>("all")

  // Modal states
  const [deleteInvoiceOpen, setDeleteInvoiceOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null)

  // Fetch data
  const fetchInvoices = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/ar-invoices`, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      setInvoices(response.data)
    } catch (error) {
      toast.error("Failed to fetch AR invoices")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchInvoices()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchInvoices])

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.docNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.businessPartner.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesSettlement = settlementFilter === "all" || invoice.settlementStatus === settlementFilter

    return matchesSearch && matchesStatus && matchesSettlement
  })

  // Invoice actions
  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return

    try {
      await axios.delete(`/api/${businessUnitId}/ar-invoices/${selectedInvoice.id}`, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      toast.success("AR invoice deleted successfully")
      setDeleteInvoiceOpen(false)
      setSelectedInvoice(null)
      fetchInvoices()
    } catch (error) {
      toast.error("Failed to delete AR invoice")
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

  const getSettlementBadge = (settlementStatus: string) => {
    const statusConfig = {
      OPEN: { variant: "outline" as const, icon: Clock, label: "Unpaid" },
      PARTIALLY_SETTLED: { variant: "secondary" as const, icon: AlertTriangle, label: "Partial" },
      SETTLED: { variant: "default" as const, icon: CheckCircle, label: "Paid" },
    }

    const config = statusConfig[settlementStatus as keyof typeof statusConfig] || statusConfig.OPEN
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
          <h1 className="text-3xl font-bold tracking-tight">AR Invoices</h1>
          <p className="text-muted-foreground">Manage accounts receivable invoices and customer billing</p>
        </div>
        <Button onClick={() => router.push(`/${businessUnitId}/sales/invoices/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Invoices</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.filter((i) => i.status === "OPEN").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{invoices.reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{invoices.reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search AR invoices by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number or customer..."
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
            <Select value={settlementFilter} onValueChange={setSettlementFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="OPEN">Unpaid</SelectItem>
                <SelectItem value="PARTIALLY_SETTLED">Partial</SelectItem>
                <SelectItem value="SETTLED">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>AR Invoices ({filteredInvoices.length})</CardTitle>
          <CardDescription>Manage your accounts receivable invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{invoice.docNum}</p>
                      {getStatusBadge(invoice.status)}
                      {getSettlementBadge(invoice.settlementStatus)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customer: {invoice.businessPartner.name} | Due: {new Date(invoice.dueDate).toLocaleDateString()} |
                      Items: {invoice.items.length}
                      {invoice.baseDelivery?.baseSalesOrder && <> | SO: {invoice.baseDelivery.baseSalesOrder.docNum}</>}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Amount: ₱{invoice.totalAmount.toLocaleString()}</span>
                      <span>Paid: ₱{invoice.amountPaid.toLocaleString()}</span>
                      <span>Balance: ₱{(invoice.totalAmount - invoice.amountPaid).toLocaleString()}</span>
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
                      onClick={() => router.push(`/${businessUnitId}/sales/invoices/${invoice.id}`)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {invoice.status === "OPEN" && (
                      <>
                        <DropdownMenuItem
                          onClick={() => toast.info("Edit functionality coming soon")}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Invoice
                        </DropdownMenuItem>
                        {invoice.settlementStatus !== "SETTLED" && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/${businessUnitId}/sales/payments/new?invoice=${invoice.id}`)}
                            className="gap-2"
                          >
                            <CreditCard className="h-4 w-4" />
                            Record Payment
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    <DropdownMenuSeparator />
                    {invoice.status !== "CLOSED" && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedInvoice(invoice)
                          setDeleteInvoiceOpen(true)
                        }}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Invoice
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {filteredInvoices.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No AR invoices found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || settlementFilter !== "all"
                    ? "Try adjusting your filters"
                    : "AR invoices will appear here when you create them"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertModal
        isOpen={deleteInvoiceOpen}
        onClose={() => {
          setDeleteInvoiceOpen(false)
          setSelectedInvoice(null)
        }}
        onConfirm={handleDeleteInvoice}
        loading={false}
      />
    </div>
  )
}

export default ARInvoicesPage
