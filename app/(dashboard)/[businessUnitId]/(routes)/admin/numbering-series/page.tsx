"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Hash, FileText } from "lucide-react"
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
import { AlertModal } from "@/components/modals/alert-modal"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { CreateNumberingSeriesModal } from "./components/create-numbering-series-modal"
import { EditNumberingSeriesModal } from "./components/edit-numbering-series-modal"

interface NumberingSeries {
  id: string
  name: string
  prefix: string
  nextNumber: number
  documentType: string
}

const documentTypeLabels: Record<string, string> = {
  SALES_ORDER: "Sales Order",
  DELIVERY: "Delivery",
  AR_INVOICE: "AR Invoice",
  PURCHASE_REQUEST: "Purchase Request",
  PURCHASE_ORDER: "Purchase Order",
  GOODS_RECEIPT_PO: "Goods Receipt PO",
  AP_INVOICE: "AP Invoice",
  JOURNAL_ENTRY: "Journal Entry",
  INCOMING_PAYMENT: "Incoming Payment",
  OUTGOING_PAYMENT: "Outgoing Payment",
}

const NumberingSeriesPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [series, setSeries] = useState<NumberingSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modal states
  const [createSeriesOpen, setCreateSeriesOpen] = useState(false)
  const [editSeriesOpen, setEditSeriesOpen] = useState(false)
  const [deleteSeriesOpen, setDeleteSeriesOpen] = useState(false)
  const [selectedSeries, setSelectedSeries] = useState<NumberingSeries | null>(null)

  // Fetch data
  const fetchSeries = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/numbering-series`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setSeries(response.data)
    } catch (error) {
      toast.error("Failed to fetch numbering series")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchSeries()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchSeries])


  // Filter series
  const filteredSeries = series.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.prefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
    documentTypeLabels[s.documentType]?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Series actions
  const handleDeleteSeries = async () => {
    if (!selectedSeries) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/numbering-series/${selectedSeries.id}`)
      toast.success("Numbering series deleted successfully")
      setDeleteSeriesOpen(false)
      setSelectedSeries(null)
      fetchSeries()
    } catch (error) {
      toast.error("Failed to delete numbering series")
      console.error(error)
    }
  }

  const getDocumentTypeBadge = (docType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "SALES_ORDER": "default",
      "DELIVERY": "secondary",
      "AR_INVOICE": "destructive",
      "PURCHASE_REQUEST": "outline",
      "PURCHASE_ORDER": "default",
      "GOODS_RECEIPT_PO": "secondary",
      "AP_INVOICE": "destructive",
      "JOURNAL_ENTRY": "outline",
      "INCOMING_PAYMENT": "default",
      "OUTGOING_PAYMENT": "secondary",
    }
    return (
      <Badge variant={variants[docType] || "outline"} className="gap-1">
        <FileText className="h-3 w-3" />
        {documentTypeLabels[docType] || docType}
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
          <h1 className="text-3xl font-bold tracking-tight">Numbering Series</h1>
          <p className="text-muted-foreground">
            Manage document numbering series for automated document generation
          </p>
        </div>
        <Button onClick={() => setCreateSeriesOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Series
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Series</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{series.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Document Types</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(series.map(s => s.documentType)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Numbers</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {series.reduce((sum, s) => sum + s.nextNumber, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find numbering series by name, prefix, or document type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search numbering series..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Series List */}
      <Card>
        <CardHeader>
          <CardTitle>Numbering Series ({filteredSeries.length})</CardTitle>
          <CardDescription>
            Manage your document numbering series
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSeries.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Hash className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.name}</p>
                      {getDocumentTypeBadge(s.documentType)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Prefix: <span className="font-mono">{s.prefix}</span> | Next: <span className="font-mono">{s.nextNumber}</span>
                    </p>
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
                      onClick={() => {
                        setSelectedSeries(s)
                        setEditSeriesOpen(true)
                      }}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Series
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedSeries(s)
                        setDeleteSeriesOpen(true)
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Series
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredSeries.length === 0 && (
              <div className="text-center py-12">
                <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No numbering series found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Get started by adding your first numbering series"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateNumberingSeriesModal
        isOpen={createSeriesOpen}
        onClose={() => setCreateSeriesOpen(false)}
        onSuccess={() => {
          fetchSeries()
          setCreateSeriesOpen(false)
        }}
      />

      <EditNumberingSeriesModal
        isOpen={editSeriesOpen}
        onClose={() => {
          setEditSeriesOpen(false)
          setSelectedSeries(null)
        }}
        onSuccess={() => {
          fetchSeries()
          setEditSeriesOpen(false)
          setSelectedSeries(null)
        }}
        series={selectedSeries}
      />

      <AlertModal
        isOpen={deleteSeriesOpen}
        onClose={() => {
          setDeleteSeriesOpen(false)
          setSelectedSeries(null)
        }}
        onConfirm={handleDeleteSeries}
        loading={false}
      />
    </div>
  )
}

export default NumberingSeriesPage