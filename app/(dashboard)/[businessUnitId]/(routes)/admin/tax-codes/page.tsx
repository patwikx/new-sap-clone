"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Calculator, Percent, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
import { useParams } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { CreateTaxCodeModal } from "./components/create-tax-code-modal"
import { EditTaxCodeModal } from "./components/edit-tax-code-modal"

interface TaxCode {
  id: string
  code: string
  name: string
  rate: number
  type: string
  isActive: boolean
  createdAt: string
}

const TaxCodesPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Modal states
  const [createTaxCodeOpen, setCreateTaxCodeOpen] = useState(false)
  const [editTaxCodeOpen, setEditTaxCodeOpen] = useState(false)
  const [deleteTaxCodeOpen, setDeleteTaxCodeOpen] = useState(false)
  const [selectedTaxCode, setSelectedTaxCode] = useState<TaxCode | null>(null)

  // Fetch data
  const fetchTaxCodes = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/tax-codes-management`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setTaxCodes(response.data)
    } catch (error) {
      toast.error("Failed to fetch tax codes")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchTaxCodes()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchTaxCodes])

  // Filter tax codes
  const filteredTaxCodes = taxCodes.filter(taxCode => {
    const matchesSearch = taxCode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          taxCode.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === "all" || taxCode.type === typeFilter
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && taxCode.isActive) ||
                          (statusFilter === "inactive" && !taxCode.isActive)

    return matchesSearch && matchesType && matchesStatus
  })

  // Tax code actions
  const handleDeleteTaxCode = async () => {
    if (!selectedTaxCode) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/tax-codes-management/${selectedTaxCode.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Tax code deleted successfully")
      setDeleteTaxCodeOpen(false)
      setSelectedTaxCode(null)
      fetchTaxCodes()
    } catch (error) {
      toast.error("Failed to delete tax code")
      console.error(error)
    }
  }

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "VAT": "default",
      "WITHHOLDING": "secondary",
      "OTHER": "outline",
    }
    return (
      <Badge variant={variants[type] || "outline"} className="gap-1">
        <Calculator className="h-3 w-3" />
        {type}
      </Badge>
    )
  }

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )

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
          <h1 className="text-3xl font-bold tracking-tight">Tax Codes</h1>
          <p className="text-muted-foreground">
            Manage tax codes and rates for financial calculations
          </p>
        </div>
        <Button onClick={() => setCreateTaxCodeOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Tax Code
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tax Codes</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <Calculator className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxCodes.filter(tc => tc.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT Codes</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxCodes.filter(tc => tc.type === 'VAT').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {taxCodes.length > 0 ? (taxCodes.reduce((sum, tc) => sum + Number(tc.rate), 0) / taxCodes.length).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter and search tax codes by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="VAT">VAT</SelectItem>
                <SelectItem value="WITHHOLDING">Withholding</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tax Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTaxCodes.length > 0 ? (
          filteredTaxCodes.map((taxCode) => (
            <Card key={taxCode.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{taxCode.name}</CardTitle>
                    <CardDescription className="font-mono text-xs pt-1">{taxCode.code}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => { setSelectedTaxCode(taxCode); setEditTaxCodeOpen(true); }} className="gap-2">
                        <Edit className="h-4 w-4" /> Edit Tax Code
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setSelectedTaxCode(taxCode); setDeleteTaxCodeOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" /> Delete Tax Code
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="flex flex-wrap gap-2">
                    {getTypeBadge(taxCode.type)}
                    {getStatusBadge(taxCode.isActive)}
                </div>
                <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Rate</p>
                    <p className="text-2xl font-bold">{Number(taxCode.rate).toFixed(2)}%</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-16 border-2 border-dashed rounded-lg">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No tax codes found</h3>
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first tax code"}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateTaxCodeModal
        isOpen={createTaxCodeOpen}
        onClose={() => setCreateTaxCodeOpen(false)}
        onSuccess={() => {
          fetchTaxCodes()
          setCreateTaxCodeOpen(false)
        }}
      />

      <EditTaxCodeModal
        isOpen={editTaxCodeOpen}
        onClose={() => {
          setEditTaxCodeOpen(false)
          setSelectedTaxCode(null)
        }}
        onSuccess={() => {
          fetchTaxCodes()
          setEditTaxCodeOpen(false)
          setSelectedTaxCode(null)
        }}
        taxCode={selectedTaxCode}
      />

      <AlertModal
        isOpen={deleteTaxCodeOpen}
        onClose={() => {
          setDeleteTaxCodeOpen(false)
          setSelectedTaxCode(null)
        }}
        onConfirm={handleDeleteTaxCode}
        loading={false}
      />
    </div>
  )
}

export default TaxCodesPage
