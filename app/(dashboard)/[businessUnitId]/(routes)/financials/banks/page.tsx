"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Banknote, Building2, CreditCard } from "lucide-react"
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
import { CreateBankAccountModal } from "./components/create-bank-account-modal"
import { EditBankAccountModal } from "./components/edit-bank-account-modal"

interface BankAccount {
  id: string
  name: string
  bankName: string
  accountNumber: string
  currency?: string
  iban?: string
  swiftCode?: string
  branch?: string
  glAccountId: string // Added this missing property
  glAccount: {
    accountCode: string
    name: string
  }
  createdAt: string
}

const BankAccountsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modal states
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [editAccountOpen, setEditAccountOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)

  // Fetch data
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/bank-accounts`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setAccounts(response.data)
    } catch (error) {
      toast.error("Failed to fetch bank accounts")
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
  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Account actions
  const handleDeleteAccount = async () => {
    if (!selectedAccount) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/bank-accounts/${selectedAccount.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Bank account deleted successfully")
      setDeleteAccountOpen(false)
      setSelectedAccount(null)
      fetchAccounts()
    } catch (error) {
      toast.error("Failed to delete bank account")
      console.error(error)
    }
  }

  const getCurrencyBadge = (currency?: string) => (
    <Badge variant="outline" className="gap-1">
      <CreditCard className="h-3 w-3" />
      {currency || "PHP"}
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
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts and financial institutions
          </p>
        </div>
        <Button onClick={() => setCreateAccountOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banks</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(accounts.map(a => a.bankName)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currencies</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(accounts.map(a => a.currency || "PHP")).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find bank accounts by name, bank, or account number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bank accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts ({filteredAccounts.length})</CardTitle>
          <CardDescription>
            Manage your bank accounts and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Banknote className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.name}</p>
                      {getCurrencyBadge(account.currency)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.bankName} | {account.accountNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GL: {account.glAccount.accountCode} - {account.glAccount.name}
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
                        setSelectedAccount(account)
                        setEditAccountOpen(true)
                      }}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Account
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedAccount(account)
                        setDeleteAccountOpen(true)
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredAccounts.length === 0 && (
              <div className="text-center py-12">
                <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No bank accounts found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Get started by adding your first bank account"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateBankAccountModal
        isOpen={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
        onSuccess={() => {
          fetchAccounts()
          setCreateAccountOpen(false)
        }}
      />

      <EditBankAccountModal
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

export default BankAccountsPage
