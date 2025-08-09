"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, FileText, CheckCircle, Clock, XCircle, Eye } from "lucide-react"
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
import { CreateJournalEntryModal } from "./components/create-journal-entry-modal"
import { EditJournalEntryModal } from "./components/edit-journal-entry-modal"

interface JournalEntry {
  id: string
  docNum: string
  documentDate: string
  postingDate: string
  reference?: string
  memo?: string
  approvalWorkflowStatus: string
  isPosted: boolean
  totalAmount: number
  author: {
    name: string
  }
  lines: {
    id: string
    glAccountId: string
    glAccount: {
      accountCode: string
      name: string
    }
    description: string
    debit?: number
    credit?: number
  }[]
  createdAt: string
}

const JournalEntriesPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Modal states
  const [createEntryOpen, setCreateEntryOpen] = useState(false)
  const [editEntryOpen, setEditEntryOpen] = useState(false)
  const [deleteEntryOpen, setDeleteEntryOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  // Fetch data
  const fetchEntries = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/journal-entries`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setEntries(response.data)
    } catch (error) {
      toast.error("Failed to fetch journal entries")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchEntries()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchEntries])

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.docNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          entry.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          entry.author.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || entry.approvalWorkflowStatus === statusFilter
    
    let matchesDate = true
    if (dateFilter !== "all") {
      const entryDate = new Date(entry.documentDate)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      
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

  // Entry actions
  const handleDeleteEntry = async () => {
    if (!selectedEntry) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/journal-entries/${selectedEntry.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Journal entry deleted successfully")
      setDeleteEntryOpen(false)
      setSelectedEntry(null)
      fetchEntries()
    } catch (error) {
      toast.error("Failed to delete journal entry")
      console.error(error)
    }
  }

  const handlePostEntry = async (entry: JournalEntry) => {
    try {
      await axios.patch(`/api/${businessUnitId}/journal-entries/${entry.id}/post`, {}, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Journal entry posted successfully")
      fetchEntries()
    } catch (error) {
      toast.error("Failed to post journal entry")
      console.error(error)
    }
  }

  const getStatusBadge = (status: string, isPosted: boolean) => {
    if (isPosted) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Posted
        </Badge>
      )
    }

    const statusConfig = {
      DRAFT: { variant: "secondary" as const, icon: Clock, label: "Draft" },
      PENDING: { variant: "outline" as const, icon: Clock, label: "Pending" },
      APPROVED: { variant: "default" as const, icon: CheckCircle, label: "Approved" },
      REJECTED: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT
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
          <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground">
            Create and manage manual journal entries for your general ledger
          </p>
        </div>
        <Button onClick={() => setCreateEntryOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.filter(e => e.isPosted).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.filter(e => !e.isPosted && e.approvalWorkflowStatus === 'PENDING').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.filter(e => e.approvalWorkflowStatus === 'DRAFT').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search journal entries by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by document number, reference, or author..."
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
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries ({filteredEntries.length})</CardTitle>
          <CardDescription>
            Manage your manual journal entries and their approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{entry.docNum}</p>
                      {getStatusBadge(entry.approvalWorkflowStatus, entry.isPosted)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.documentDate).toLocaleDateString()} | 
                      Amount: ₱{entry.totalAmount.toLocaleString()} | 
                      By: {entry.author.name}
                    </p>
                    {entry.reference && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {entry.reference}
                      </p>
                    )}
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
                    {!entry.isPosted && (
                      <>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedEntry(entry)
                            setEditEntryOpen(true)
                          }}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Entry
                        </DropdownMenuItem>
                        {entry.approvalWorkflowStatus === 'APPROVED' && (
                          <DropdownMenuItem
                            onClick={() => handlePostEntry(entry)}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Post Entry
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    <DropdownMenuSeparator />
                    {!entry.isPosted && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedEntry(entry)
                          setDeleteEntryOpen(true)
                        }}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Entry
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No journal entries found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first journal entry"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateJournalEntryModal
        isOpen={createEntryOpen}
        onClose={() => setCreateEntryOpen(false)}
        onSuccess={() => {
          fetchEntries()
          setCreateEntryOpen(false)
        }}
      />

      <EditJournalEntryModal
        isOpen={editEntryOpen}
        onClose={() => {
          setEditEntryOpen(false)
          setSelectedEntry(null)
        }}
        onSuccess={() => {
          fetchEntries()
          setEditEntryOpen(false)
          setSelectedEntry(null)
        }}
        entry={selectedEntry}
      />

      <AlertModal
        isOpen={deleteEntryOpen}
        onClose={() => {
          setDeleteEntryOpen(false)
          setSelectedEntry(null)
        }}
        onConfirm={handleDeleteEntry}
        loading={false}
      />
    </div>
  )
}

export default JournalEntriesPage