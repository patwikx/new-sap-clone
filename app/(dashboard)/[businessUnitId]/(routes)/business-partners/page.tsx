"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Users, Phone, Mail, Building } from "lucide-react"
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
import { CreateBusinessPartnerModal } from "./components/create-business-partner-modal"
import { EditBusinessPartnerModal } from "./components/edit-business-partner-modal"

interface BusinessPartner {
  id: string
  bpCode: string
  name: string
  type: string
  phone?: string
  email?: string
  address?: string
  taxId?: string
  contactPerson?: string
  paymentTerms?: string
  creditLimit?: number
  createdAt: string
}

const BusinessPartnersPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [partners, setPartners] = useState<BusinessPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Modal states
  const [createPartnerOpen, setCreatePartnerOpen] = useState(false)
  const [editPartnerOpen, setEditPartnerOpen] = useState(false)
  const [deletePartnerOpen, setDeletePartnerOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<BusinessPartner | null>(null)

  // Fetch data
  const fetchPartners = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/business-partners`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setPartners(response.data)
    } catch (error) {
      toast.error("Failed to fetch business partners")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchPartners()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchPartners])

  // Filter partners
  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          partner.bpCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          partner.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === "all" || partner.type === typeFilter

    return matchesSearch && matchesType
  })

  // Partner actions
  const handleDeletePartner = async () => {
    if (!selectedPartner) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/business-partners/${selectedPartner.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Business partner deleted successfully")
      setDeletePartnerOpen(false)
      setSelectedPartner(null)
      fetchPartners()
    } catch (error) {
      toast.error("Failed to delete business partner")
      console.error(error)
    }
  }

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "CUSTOMER": "default",
      "VENDOR": "secondary",
      "BOTH": "destructive",
    }
    return (
      <Badge variant={variants[type] || "outline"} className="gap-1">
        <Building className="h-3 w-3" />
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
          <h1 className="text-3xl font-bold tracking-tight">Business Partners</h1>
          <p className="text-muted-foreground">
            Manage your customers and vendors
          </p>
        </div>
        <Button onClick={() => setCreatePartnerOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Partner
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partners.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partners.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partners.filter(p => p.type === 'VENDOR' || p.type === 'BOTH').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Both Types</CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partners.filter(p => p.type === 'BOTH').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search business partners by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search partners by name, code, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CUSTOMER">Customers Only</SelectItem>
                <SelectItem value="VENDOR">Vendors Only</SelectItem>
                <SelectItem value="BOTH">Both Types</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Partners List */}
      <Card>
        <CardHeader>
          <CardTitle>Business Partners ({filteredPartners.length})</CardTitle>
          <CardDescription>
            Manage your business partners and their information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPartners.map((partner) => (
              <div
                key={partner.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{partner.name}</p>
                      {getTypeBadge(partner.type)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Code: {partner.bpCode}
                      {partner.contactPerson && ` | Contact: ${partner.contactPerson}`}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {partner.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {partner.phone}
                        </div>
                      )}
                      {partner.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {partner.email}
                        </div>
                      )}
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
                      onClick={() => {
                        setSelectedPartner(partner)
                        setEditPartnerOpen(true)
                      }}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Partner
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPartner(partner)
                        setDeletePartnerOpen(true)
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Partner
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredPartners.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No business partners found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || typeFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by adding your first business partner"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateBusinessPartnerModal
        isOpen={createPartnerOpen}
        onClose={() => setCreatePartnerOpen(false)}
        onSuccess={() => {
          fetchPartners()
          setCreatePartnerOpen(false)
        }}
      />

      <EditBusinessPartnerModal
        isOpen={editPartnerOpen}
        onClose={() => {
          setEditPartnerOpen(false)
          setSelectedPartner(null)
        }}
        onSuccess={() => {
          fetchPartners()
          setEditPartnerOpen(false)
          setSelectedPartner(null)
        }}
        partner={selectedPartner}
      />

      <AlertModal
        isOpen={deletePartnerOpen}
        onClose={() => {
          setDeletePartnerOpen(false)
          setSelectedPartner(null)
        }}
        onConfirm={handleDeletePartner}
        loading={false}
      />
    </div>
  )
}

export default BusinessPartnersPage
