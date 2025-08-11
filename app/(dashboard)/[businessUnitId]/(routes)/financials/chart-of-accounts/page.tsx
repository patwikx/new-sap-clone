"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, FileText, Building2, DollarSign } from "lucide-react"
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
import { CreateGlAccountModal } from "./components/create-gl-accounts-modal"
import { EditGlAccountModal } from "./components/edit-gl-accounts-modal"


interface GlAccount {
  id: string
  accountCode: string
  name: string
  normalBalance: string
  description?: string
  isControlAccount: boolean
  accountTypeId: string
  accountCategoryId?: string
  accountGroupId?: string
  accountType: {
    name: string
  }
  accountCategory?: {
    name: string
  }
  createdAt: string
}

const ChartOfAccountsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [accounts, setAccounts] = useState<GlAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [balanceFilter, setBalanceFilter] = useState<string>("all")

  // Modal states
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [editAccountOpen, setEditAccountOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<GlAccount | null>(null)

  // Fetch data
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/gl-accounts`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setAccounts(response.data)
    } catch (error) {
      toast.error("Failed to fetch GL accounts")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchAccounts()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchAccounts])

  // Filter accounts
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          account.accountCode.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === "all" || account.accountType.name === typeFilter
    const matchesBalance = balanceFilter === "all" || account.normalBalance === balanceFilter

    return matchesSearch && matchesType && matchesBalance
  })

  // Account actions
  const handleDeleteAccount = async () => {
    if (!selectedAccount) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/gl-accounts/${selectedAccount.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("GL account deleted successfully")
      setDeleteAccountOpen(false)
      setSelectedAccount(null)
      fetchAccounts()
    } catch (error) {
      toast.error("Failed to delete GL account")
      console.error(error)
    }
  }

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "ASSET": "default",
      "LIABILITY": "secondary",
      "EQUITY": "destructive",
      "REVENUE": "outline",
      "EXPENSE": "default",
    }
    return (
      <Badge variant={variants[type] || "outline"} className="gap-1">
        <Building2 className="h-3 w-3" />
        {type}
      </Badge>
    )
  }

  const getBalanceBadge = (balance: string) => (
    <Badge variant={balance === "DEBIT" ? "default" : "secondary"} className="gap-1">
      <DollarSign className="h-3 w-3" />
      {balance}
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
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            Manage your general ledger accounts and account structure
          </p>
        </div>
        <Button onClick={() => setCreateAccountOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.filter(a => a.accountType.name === 'ASSET').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liabilities</CardTitle>
            <Building2 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.filter(a => a.accountType.name === 'LIABILITY').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.filter(a => a.accountType.name === 'REVENUE').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <Building2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.filter(a => a.accountType.name === 'EXPENSE').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter and search GL accounts by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search accounts by code or name..."
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
                <SelectItem value="ASSET">Assets</SelectItem>
                <SelectItem value="LIABILITY">Liabilities</SelectItem>
                <SelectItem value="EQUITY">Equity</SelectItem>
                <SelectItem value="REVENUE">Revenue</SelectItem>
                <SelectItem value="EXPENSE">Expenses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Balances</SelectItem>
                <SelectItem value="DEBIT">Debit</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAccounts.length > 0 ? (
          filteredAccounts.map((account) => (
            <Card key={account.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <CardDescription className="font-mono text-xs pt-1">{account.accountCode}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => { setSelectedAccount(account); setEditAccountOpen(true); }} className="gap-2">
                        <Edit className="h-4 w-4" /> Edit Account
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setSelectedAccount(account); setDeleteAccountOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" /> Delete Account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="flex flex-wrap gap-2">
                  {getTypeBadge(account.accountType.name)}
                  {getBalanceBadge(account.normalBalance)}
                  {account.isControlAccount && (
                    <Badge variant="outline" className="text-xs">Control Account</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground pt-2 border-t">
                  {account.description || "No description provided."}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3 text-center py-16 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No GL accounts found</h3>
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== "all" || balanceFilter !== "all"
                ? "Try adjusting your filters"
                : "Your chart of accounts will appear here"}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGlAccountModal
        isOpen={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
        onSuccess={() => {
          fetchAccounts()
          setCreateAccountOpen(false)
        }}
      />

      <EditGlAccountModal
        isOpen={editAccountOpen}
        onClose={() => {
          setEditAccountOpen(false)
          setSelectedAccount(null)
        }}
        onSuccess={() => {
          fetchAccounts()
          setEditAccountOpen(false)
          setSelectedAccount(null)
        }}
        account={selectedAccount}
      />

      <AlertModal
        isOpen={deleteAccountOpen}
        onClose={() => {
          setDeleteAccountOpen(false)
          setSelectedAccount(null)
        }}
        onConfirm={handleDeleteAccount}
        loading={false}
      />
    </div>
  )
}

export default ChartOfAccountsPage
