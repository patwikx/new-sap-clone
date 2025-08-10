"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Trash2, Truck, CheckCircle, Clock, Package, Eye, FileText } from "lucide-react"
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
    }
  }
  receivedBy: {
    name: string
  }
  items: {
    id: string
    quantity: number
    batchNumber?: string
    expiryDate?: string
    inventoryItem?: {
      name: string
    }
    inventoryLocation: {
      name: string
    }
    purchaseOrderItem: {
      description: string
      unitPrice: number
    }
  }[]
  totalQuantity: number
  totalValue: number
  createdAt: string
}

const GoodsReceiptPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Modal states
  const [deleteReceiptOpen, setDeleteReceiptOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null)
  const router = useRouter();

  // Fetch data
  const fetchReceipts = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/goods-receipts`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setReceipts(response.data)
    } catch (error) {
      toast.error("Failed to fetch goods receipts")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchReceipts()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchReceipts])

  // Filter receipts
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.docNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          receipt.basePurchaseOrder.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          receipt.basePurchaseOrder.businessPartner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          receipt.receivedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesDate = true
    if (dateFilter !== "all") {
      const receiptDate = new Date(receipt.documentDate)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24))
      
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

  // Receipt actions
  const handleDeleteReceipt = async () => {
    if (!selectedReceipt) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/goods-receipts/${selectedReceipt.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Goods receipt deleted successfully")
      setDeleteReceiptOpen(false)
      setSelectedReceipt(null)
      fetchReceipts()
    } catch (error) {
      toast.error("Failed to delete goods receipt")
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
          <h1 className="text-3xl font-bold tracking-tight">Goods Receipt</h1>
          <p className="text-muted-foreground">
            Record and manage the receipt of goods from purchase orders
          </p>
        </div>
 <Button onClick={() => router.push(`/${businessUnitId}/purchasing/receiving/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Receipt
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receipts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Receipts</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receipts.filter(r => new Date(r.documentDate).toDateString() === new Date().toDateString()).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{receipts.reduce((sum, r) => sum + r.totalValue, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Received</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receipts.reduce((sum, r) => sum + r.totalQuantity, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search goods receipts by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by receipt number, PO number, vendor, or receiver..."
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

      {/* Receipts List */}
      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts ({filteredReceipts.length})</CardTitle>
          <CardDescription>
            Track all goods received from purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{receipt.docNum}</p>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Received
                      </Badge>
                      {receipt.deliveryNote && (
                        <Badge variant="outline" className="text-xs">
                          DN: {receipt.deliveryNote}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      PO: {receipt.basePurchaseOrder.poNumber} | 
                      Vendor: {receipt.basePurchaseOrder.businessPartner.name} | 
                      Received by: {receipt.receivedBy.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Date: {new Date(receipt.documentDate).toLocaleDateString()}</span>
                      <span>Items: {receipt.items.length}</span>
                      <span>Qty: {receipt.totalQuantity.toLocaleString()}</span>
                      <span>Value: ₱{receipt.totalValue.toLocaleString()}</span>
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
                      onClick={() => toast.info("View functionality coming soon")}
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
                      Print Receipt
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedReceipt(receipt)
                        setDeleteReceiptOpen(true)
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Receipt
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredReceipts.length === 0 && (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No goods receipts found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || dateFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Goods receipts will appear here when you receive items from purchase orders"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertModal
        isOpen={deleteReceiptOpen}
        onClose={() => {
          setDeleteReceiptOpen(false)
          setSelectedReceipt(null)
        }}
        onConfirm={handleDeleteReceipt}
        loading={false}
      />
    </div>
  )
}

export default GoodsReceiptPage