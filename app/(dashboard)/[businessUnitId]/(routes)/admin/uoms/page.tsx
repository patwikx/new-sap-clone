"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CreateUoMModal } from "./components/create-uom-modal"
import { EditUoMModal } from "./components/edit-uom-modal"

interface UoM {
  id: string
  name: string
  symbol: string
  createdAt: string
}

const UoMsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [uoms, setUoms] = useState<UoM[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modal states
  const [createUoMOpen, setCreateUoMOpen] = useState(false)
  const [editUoMOpen, setEditUoMOpen] = useState(false)
  const [deleteUoMOpen, setDeleteUoMOpen] = useState(false)
  const [selectedUoM, setSelectedUoM] = useState<UoM | null>(null)

  // Fetch data
  const fetchUoMs = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/uoms-management`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setUoms(response.data)
    } catch (error) {
      toast.error("Failed to fetch units of measure")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchUoMs()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchUoMs])

  // Filter UoMs
  const filteredUoMs = uoms.filter(uom => 
    uom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uom.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // UoM actions
  const handleDeleteUoM = async () => {
    if (!selectedUoM) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/uoms-management/${selectedUoM.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Unit of measure deleted successfully")
      setDeleteUoMOpen(false)
      setSelectedUoM(null)
      fetchUoMs()
    } catch (error) {
      toast.error("Failed to delete unit of measure")
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
          <h1 className="text-3xl font-bold tracking-tight">Units of Measure</h1>
          <p className="text-muted-foreground">
            Manage units of measure for inventory and transactions
          </p>
        </div>
        <Button onClick={() => setCreateUoMOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add UoM
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total UoMs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uoms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Symbols</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(uoms.map(u => u.symbol)).size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find units of measure by name or symbol</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search units of measure..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* UoMs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUoMs.length > 0 ? (
          filteredUoMs.map((uom) => (
            <Card key={uom.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{uom.name}</CardTitle>
                    <CardDescription className="pt-1">
                      Symbol: <span className="font-mono font-medium">{uom.symbol}</span>
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
                      <DropdownMenuItem onClick={() => { setSelectedUoM(uom); setEditUoMOpen(true); }} className="gap-2">
                        <Edit className="h-4 w-4" /> Edit UoM
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setSelectedUoM(uom); setDeleteUoMOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" /> Delete UoM
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(uom.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-16 border-2 border-dashed rounded-lg">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No units of measure found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Get started by adding your first unit of measure"}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateUoMModal
        isOpen={createUoMOpen}
        onClose={() => setCreateUoMOpen(false)}
        onSuccess={() => {
          fetchUoMs()
          setCreateUoMOpen(false)
        }}
      />

      <EditUoMModal
        isOpen={editUoMOpen}
        onClose={() => {
          setEditUoMOpen(false)
          setSelectedUoM(null)
        }}
        onSuccess={() => {
          fetchUoMs()
          setEditUoMOpen(false)
          setSelectedUoM(null)
        }}
        uom={selectedUoM}
      />

      <AlertModal
        isOpen={deleteUoMOpen}
        onClose={() => {
          setDeleteUoMOpen(false)
          setSelectedUoM(null)
        }}
        onConfirm={handleDeleteUoM}
        loading={false}
      />
    </div>
  )
}

export default UoMsPage