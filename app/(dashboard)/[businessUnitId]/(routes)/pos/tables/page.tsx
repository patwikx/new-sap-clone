"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, MapPin, Users, CheckCircle, Clock } from "lucide-react"
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
import { useCurrentUser } from "@/lib/current-user"
import { CreateTableModal } from "./components/create-table-modal"
import { EditTableModal } from "./components/edit-table-modal"

interface Table {
  id: string
  name: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
  capacity?: number
  location?: string
  currentOrder?: {
    orderNumber: string
    customerName?: string
    totalAmount: number
  }
  createdAt: string
}

const POSTablesPage = () => {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
  const user = useCurrentUser()

  // Check authorization
  const isAuthorized = user?.role?.role === 'Admin'

  // State management
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Modal states
  const [createTableOpen, setCreateTableOpen] = useState(false)
  const [editTableOpen, setEditTableOpen] = useState(false)
  const [deleteTableOpen, setDeleteTableOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  // Redirect if not authorized
  useEffect(() => {
    if (!isAuthorized) {
      router.push(`/${businessUnitId}/not-authorized`)
    }
  }, [isAuthorized, router, businessUnitId])

  // Fetch tables
  const fetchTables = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/pos/tables-management`, {
        headers: { 'x-business-unit-id': businessUnitId }
      })
      setTables(response.data)
    } catch (error) {
      toast.error("Failed to fetch tables")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthorized) return
      
      setLoading(true)
      await fetchTables()
      setLoading(false)
    }

    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchTables, isAuthorized])

  // Filter tables
  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          table.location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || table.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Table actions
  const handleDeleteTable = async () => {
    if (!selectedTable) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/pos/tables-management/${selectedTable.id}`, {
        headers: { 'x-business-unit-id': businessUnitId }
      })
      toast.success("Table deleted successfully")
      setDeleteTableOpen(false)
      setSelectedTable(null)
      fetchTables()
    } catch (error) {
      toast.error("Failed to delete table")
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      AVAILABLE: { variant: "default" as const, icon: CheckCircle, label: "Available" },
      OCCUPIED: { variant: "destructive" as const, icon: Users, label: "Occupied" },
      RESERVED: { variant: "secondary" as const, icon: Clock, label: "Reserved" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.AVAILABLE
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Calculate summary metrics
  const totalTables = tables.length
  const availableTables = tables.filter(t => t.status === 'AVAILABLE').length
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length
  const reservedTables = tables.filter(t => t.status === 'RESERVED').length

  if (!isAuthorized) {
    return null // Will redirect in useEffect
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
          <h1 className="text-3xl font-bold tracking-tight">Table Management</h1>
          <p className="text-muted-foreground">
            Manage restaurant tables and seating arrangements
          </p>
        </div>
        <Button onClick={() => setCreateTableOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Table
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTables}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTables}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupiedTables}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservedTables}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search tables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tables by name or location..."
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
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="OCCUPIED">Occupied</SelectItem>
                <SelectItem value="RESERVED">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <Card>
        <CardHeader>
            <CardTitle>Tables ({filteredTables.length})</CardTitle>
            <CardDescription>
                Manage your restaurant tables and their current status
            </CardDescription>
        </CardHeader>
        <CardContent>
            {filteredTables.length > 0 ? (
                // Responsive grid container
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTables.map((table) => (
                        // Each table is now its own Card for a better grid appearance
                        <Card key={table.id} className="flex flex-col">
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div>
                                    <CardTitle>{table.name}</CardTitle>
                                    <CardDescription className="pt-1">
                                        {getStatusBadge(table.status)}
                                    </CardDescription>
                                </div>
                                {/* Actions Dropdown */}
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
                                                setSelectedTable(table)
                                                setEditTableOpen(true)
                                            }}
                                            className="gap-2"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Edit Table
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {table.status === 'AVAILABLE' && (
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setSelectedTable(table)
                                                    setDeleteTableOpen(true)
                                                }}
                                                className="gap-2 text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete Table
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3">
                                <div className="flex items-center text-sm text-muted-foreground gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>Capacity: {table.capacity || 'N/A'}</span>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{table.location || 'No location'}</span>
                                </div>
                                {/* Current order details */}
                                {table.currentOrder && (
                                    <div className="border-t pt-3 mt-3 space-y-1 text-xs">
                                        <p className="font-semibold">Current Order: {table.currentOrder.orderNumber}</p>
                                        <p className="text-muted-foreground">
                                            {table.currentOrder.customerName || 'Walk-in Customer'}
                                        </p>
                                        <p className="font-medium">
                                            Amount: ₱{table.currentOrder.totalAmount.toLocaleString()}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                // Displayed when no tables match the filter
                <div className="text-center py-16">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No tables found</h3>
                    <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Get started by adding your first table"}
                    </p>
                </div>
            )}
        </CardContent>
    </Card>

      {/* Modals */}
      <CreateTableModal
        isOpen={createTableOpen}
        onClose={() => setCreateTableOpen(false)}
        onSuccess={() => {
          fetchTables()
          setCreateTableOpen(false)
        }}
        businessUnitId={businessUnitId}
      />

      <EditTableModal
        isOpen={editTableOpen}
        onClose={() => {
          setEditTableOpen(false)
          setSelectedTable(null)
        }}
        onSuccess={() => {
          fetchTables()
          setEditTableOpen(false)
          setSelectedTable(null)
        }}
        table={selectedTable}
        businessUnitId={businessUnitId}
      />

      <AlertModal
        isOpen={deleteTableOpen}
        onClose={() => {
          setDeleteTableOpen(false)
          setSelectedTable(null)
        }}
        onConfirm={handleDeleteTable}
        loading={false}
      />
    </div>
  )
}

export default POSTablesPage