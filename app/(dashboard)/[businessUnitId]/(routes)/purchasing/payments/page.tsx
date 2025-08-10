"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Trash2, CreditCard, CheckCircle, Clock, Building2, Eye, FileText } from "lucide-react"
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

interface OutgoingPayment {
  id: string
  docNum: string
  paymentDate: string
  amount: number
  businessPartner: {
    name: string
  }
  bankAccount: {
    name: string
    bankName: string
  }
  applications: {
    id: string
    amountApplied: number
    apInvoice: {
      docNum: string
      totalAmount: number
    }
  }[]
  createdBy: {
    name: string
  } | null // Can be null
  createdAt: string
}

const OutgoingPaymentsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [payments, setPayments] = useState<OutgoingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Modal states
  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<OutgoingPayment | null>(null)
  const router = useRouter()

  // Fetch data
  const fetchPayments = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/outgoing-payments`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setPayments(response.data)
    } catch (error) {
      toast.error("Failed to fetch outgoing payments")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchPayments()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchPayments])

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.docNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.businessPartner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.createdBy?.name.toLowerCase().includes(searchTerm.toLowerCase()) // Safe access
    
    let matchesDate = true
    if (dateFilter !== "all") {
      const paymentDate = new Date(payment.paymentDate)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))
      
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

    return matchesSearch && matchesDate
  })

  // Payment actions
  const handleDeletePayment = async () => {
    if (!selectedPayment) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/outgoing-payments/${selectedPayment.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Outgoing payment deleted successfully")
      setDeletePaymentOpen(false)
      setSelectedPayment(null)
      fetchPayments()
    } catch (error) {
      toast.error("Failed to delete outgoing payment")
      console.error(error)
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
          <h1 className="text-3xl font-bold tracking-tight">Outgoing Payments</h1>
          <p className="text-muted-foreground">
            Manage payments to vendors and suppliers
          </p>
        </div>
        <Button onClick={() => router.push(`/${businessUnitId}/purchasing/payments/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Payment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Payments</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => new Date(p.paymentDate).toDateString() === new Date().toDateString()).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors Paid</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(payments.map(p => p.businessPartner.name)).size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search outgoing payments by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by payment number, vendor, or created by..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Outgoing Payments ({filteredPayments.length})</CardTitle>
          <CardDescription>
            Track all payments made to vendors and suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{payment.docNum}</p>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      To: {payment.businessPartner.name} | 
                      Bank: {payment.bankAccount.name} | 
                      By: {payment.createdBy?.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Date: {new Date(payment.paymentDate).toLocaleDateString()}</span>
                      <span>Amount: ₱{payment.amount.toLocaleString()}</span>
                      <span>Applied to: {payment.applications.length} invoice(s)</span>
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
                      onClick={() => router.push(`/${businessUnitId}/purchasing/payments/${payment.id}`)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toast.info("Print functionality coming soon")}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Print Payment
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPayment(payment)
                        setDeletePaymentOpen(true)
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Payment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredPayments.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No outgoing payments found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || dateFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Outgoing payments will appear here when you make payments to vendors"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertModal
        isOpen={deletePaymentOpen}
        onClose={() => {
          setDeletePaymentOpen(false)
          setSelectedPayment(null)
        }}
        onConfirm={handleDeletePayment}
        loading={false}
      />
    </div>
  )
}

export default OutgoingPaymentsPage
