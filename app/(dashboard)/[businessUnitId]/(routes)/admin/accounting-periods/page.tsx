"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Calendar, Clock, CheckCircle, XCircle, Lock } from "lucide-react"
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
import { useParams } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { CreateAccountingPeriodModal } from "./components/create-accounting-period"
import { EditAccountingPeriodModal } from "./components/edit-accounting-periods"

interface AccountingPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  fiscalYear: number
  periodNumber: number
  type: string
  status: string
  createdBy?: {
    name: string
  }
  updatedBy?: {
    name: string
  }
}

const AccountingPeriodsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Modal states
  const [createPeriodOpen, setCreatePeriodOpen] = useState(false)
  const [editPeriodOpen, setEditPeriodOpen] = useState(false)
  const [deletePeriodOpen, setDeletePeriodOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null)

  // Fetch data
 const fetchPeriods = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/accounting-periods`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setPeriods(response.data)
    } catch (error) {
      toast.error("Failed to fetch accounting periods")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchPeriods()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchPeriods])

  // Filter periods
  const filteredPeriods = periods.filter(period => {
    const matchesSearch = period.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          period.fiscalYear.toString().includes(searchTerm)
    
    const matchesStatus = statusFilter === "all" || period.status === statusFilter
    const matchesType = typeFilter === "all" || period.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  // Period actions
  const handleDeletePeriod = async () => {
    if (!selectedPeriod) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/accounting-periods/${selectedPeriod.id}`)
      toast.success("Accounting period deleted successfully")
      setDeletePeriodOpen(false)
      setSelectedPeriod(null)
      fetchPeriods()
    } catch (error) {
      toast.error("Failed to delete accounting period")
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      OPEN: { variant: "default" as const, icon: CheckCircle, label: "Open" },
      CLOSED: { variant: "secondary" as const, icon: XCircle, label: "Closed" },
      LOCKED: { variant: "destructive" as const, icon: Lock, label: "Locked" },
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

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      "MONTHLY": "default",
      "QUARTERLY": "secondary",
      "YEARLY": "outline",
    }
    return (
      <Badge variant={variants[type] || "outline"} className="gap-1">
        <Clock className="h-3 w-3" />
        {type.charAt(0) + type.slice(1).toLowerCase()}
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
          <h1 className="text-3xl font-bold tracking-tight">Accounting Periods</h1>
          <p className="text-muted-foreground">
            Manage accounting periods for financial reporting and posting control
          </p>
        </div>
        <Button onClick={() => setCreatePeriodOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Period
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Periods</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Periods</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periods.filter(p => p.status === 'OPEN').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Periods</CardTitle>
            <XCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periods.filter(p => p.status === 'CLOSED').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Periods</CardTitle>
            <Lock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periods.filter(p => p.status === 'LOCKED').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter and search accounting periods by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search periods by name or fiscal year..."
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
                <SelectItem value="OPEN">Open Only</SelectItem>
                <SelectItem value="CLOSED">Closed Only</SelectItem>
                <SelectItem value="LOCKED">Locked Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Periods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPeriods.length > 0 ? (
          filteredPeriods.map((period) => (
            <Card key={period.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{period.name}</CardTitle>
                    <CardDescription className="pt-1">
                      FY {period.fiscalYear} - Period {period.periodNumber}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => { setSelectedPeriod(period); setEditPeriodOpen(true); }} className="gap-2">
                        <Edit className="h-4 w-4" /> Edit Period
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setSelectedPeriod(period); setDeletePeriodOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" /> Delete Period
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(period.status)}
                  {getTypeBadge(period.type)}
                </div>
                <div className="text-sm text-muted-foreground border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3 text-center py-16 border-2 border-dashed rounded-lg">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No accounting periods found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first accounting period"}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateAccountingPeriodModal
        isOpen={createPeriodOpen}
        onClose={() => setCreatePeriodOpen(false)}
        onSuccess={() => {
          fetchPeriods()
          setCreatePeriodOpen(false)
        }}
      />

      <EditAccountingPeriodModal
        isOpen={editPeriodOpen}
        onClose={() => {
          setEditPeriodOpen(false)
          setSelectedPeriod(null)
        }}
        onSuccess={() => {
          fetchPeriods()
          setEditPeriodOpen(false)
          setSelectedPeriod(null)
        }}
        period={selectedPeriod}
      />

      <AlertModal
        isOpen={deletePeriodOpen}
        onClose={() => {
          setDeletePeriodOpen(false)
          setSelectedPeriod(null)
        }}
        onConfirm={handleDeletePeriod}
        loading={false}
      />
    </div>
  )
}

export default AccountingPeriodsPage
