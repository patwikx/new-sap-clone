"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search } from "lucide-react"
import { ReportFilters } from "./report-filter"
import axios from "axios"
import { useParams } from "next/navigation"
import { toast } from "sonner"

interface GLAccountBalanceData {
  asOfDate: string
  accounts: GLAccountBalance[]
  summary: {
    totalDebits: number
    totalCredits: number
    accountCount: number
  }
}

interface GLAccountBalance {
  accountCode: string
  accountName: string
  accountType: string
  normalBalance: string
  debitBalance: number
  creditBalance: number
  netBalance: number
  isControlAccount: boolean
  category?: string
}

interface GLAccountBalancesProps {
  filters: ReportFilters
}

export const GLAccountBalances = ({ filters }: GLAccountBalancesProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const [data, setData] = useState<GLAccountBalanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    fetchGLBalances()
  }, [filters])

  const fetchGLBalances = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/reports/gl-balances`, {
        headers: { 'x-business-unit-id': businessUnitId },
        params: filters
      })
      setData(response.data)
    } catch (error) {
      toast.error("Failed to fetch GL account balances")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "-"
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getAccountTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "ASSET": "default",
      "LIABILITY": "secondary",
      "EQUITY": "destructive",
      "REVENUE": "outline",
      "EXPENSE": "default",
    }
    return (
      <Badge variant={variants[type] || "outline"} className="text-xs">
        {type}
      </Badge>
    )
  }

  // Filter accounts based on search and type
  const filteredAccounts = data?.accounts.filter(account => {
    const matchesSearch = account.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          account.accountName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || account.accountType === typeFilter
    const hasBalance = !filters.includeZeroBalances ? account.netBalance !== 0 : true
    
    return matchesSearch && matchesType && hasBalance
  }) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No data available</h3>
            <p className="text-muted-foreground">Adjust your filters and try again</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" id="gl-balances-report">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">General Ledger Account Balances</h1>
        <p className="text-muted-foreground">As of {new Date(data.asOfDate).toLocaleDateString()}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.accountCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(data.summary.totalDebits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.totalCredits)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by account code or name..."
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
                <SelectItem value="ASSET">Assets</SelectItem>
                <SelectItem value="LIABILITY">Liabilities</SelectItem>
                <SelectItem value="EQUITY">Equity</SelectItem>
                <SelectItem value="REVENUE">Revenue</SelectItem>
                <SelectItem value="EXPENSE">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Account Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Account Balances ({filteredAccounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-3 mb-4">
            <div className="col-span-2">Account Code</div>
            <div className="col-span-4">Account Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Debit Balance</div>
            <div className="col-span-2 text-right">Credit Balance</div>
          </div>

          {/* Account Rows */}
          <div className="space-y-2">
            {filteredAccounts.map((account) => (
              <div key={account.accountCode} className="grid grid-cols-12 gap-2 items-center py-2 hover:bg-muted/50 rounded-md px-2">
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{account.accountCode}</span>
                    {account.isControlAccount && (
                      <Badge variant="outline" className="text-xs">Control</Badge>
                    )}
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">{account.accountName}</span>
                    {account.category && (
                      <div className="text-xs text-muted-foreground">{account.category}</div>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  {getAccountTypeBadge(account.accountType)}
                </div>
                <div className="col-span-2 text-right text-sm font-medium">
                  {formatCurrency(account.debitBalance)}
                </div>
                <div className="col-span-2 text-right text-sm font-medium">
                  {formatCurrency(account.creditBalance)}
                </div>
              </div>
            ))}
          </div>

          {filteredAccounts.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No accounts found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}