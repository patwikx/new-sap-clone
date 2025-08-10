"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Package, 
  FileText, 
  AlertTriangle,
  BarChart3,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Building2,
  CreditCard,
  Truck
} from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import Link from "next/link"

interface DashboardData {
  summary: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    profitMargin: number
    totalCustomers: number
    totalVendors: number
    totalInventoryValue: number
    lowStockItems: number
    pendingPurchaseRequests: number
    pendingJournalEntries: number
    openPurchaseOrders: number
    overdueInvoices: number
  }
  revenueChart: {
    month: string
    revenue: number
    expenses: number
    profit: number
  }[]
  recentTransactions: {
    id: string
    type: string
    docNum: string
    amount: number
    businessPartner: string
    date: string
    status: string
  }[]
  pendingApprovals: {
    id: string
    type: string
    docNum: string
    amount: number
    requestor: string
    date: string
    priority?: string
  }[]
  topCustomers: {
    name: string
    totalSales: number
    lastOrder: string
  }[]
  inventoryAlerts: {
    itemName: string
    currentStock: number
    reorderPoint: number
    location: string
  }[]
  quickStats: {
    totalGlAccounts: number
    totalBankAccounts: number
    totalMenuItems: number
    activePosTerminals: number
  }
}

const DashboardPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  useEffect(() => {
    fetchDashboardData()
  }, [businessUnitId, timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/dashboard`, {
        headers: { 'x-business-unit-id': businessUnitId },
        params: { timeRange }
      })
      setData(response.data)
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      OPEN: { variant: "default" as const, icon: Clock },
      POSTED: { variant: "secondary" as const, icon: CheckCircle },
      CLOSED: { variant: "outline" as const, icon: CheckCircle },
      CANCELLED: { variant: "destructive" as const, icon: XCircle },
      PENDING: { variant: "outline" as const, icon: Clock },
      APPROVED: { variant: "default" as const, icon: CheckCircle },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.OPEN
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "LOW": "outline",
      "MEDIUM": "secondary", 
      "HIGH": "default",
      "URGENT": "destructive",
    }
    
    return (
      <Badge variant={variants[priority] || "outline"} className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {priority}
      </Badge>
    )
  }

  const getDocumentIcon = (type: string) => {
    const icons = {
      AR_INVOICE: FileText,
      PURCHASE_ORDER: ShoppingCart,
      JOURNAL_ENTRY: FileText,
      PURCHASE_REQUEST: FileText,
      GOODS_RECEIPT: Truck,
      OUTGOING_PAYMENT: CreditCard,
    }
    return icons[type as keyof typeof icons] || FileText
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No dashboard data available</h3>
        <p className="text-muted-foreground">Please check your configuration</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your business.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7D
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30D
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
          >
            90D
          </Button>
          <Button
            variant={timeRange === '1y' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('1y')}
          >
            1Y
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Profit Margin: {data.summary.profitMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.netProfit)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              Expenses: {formatCurrency(data.summary.totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(data.summary.totalCustomers + data.summary.totalVendors).toLocaleString()}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{data.summary.totalCustomers} customers</span>
              <span>•</span>
              <span>{data.summary.totalVendors} vendors</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalInventoryValue)}</div>
            <div className="flex items-center text-xs text-orange-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {data.summary.lowStockItems} low stock alerts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      {(data.summary.pendingPurchaseRequests > 0 || data.summary.pendingJournalEntries > 0 || data.summary.overdueInvoices > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          {data.summary.pendingPurchaseRequests > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {data.summary.pendingPurchaseRequests + data.summary.pendingJournalEntries}
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Documents awaiting approval
                </p>
              </CardContent>
            </Card>
          )}

          {data.summary.openPurchaseOrders > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Open Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {data.summary.openPurchaseOrders}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Orders pending receipt
                </p>
              </CardContent>
            </Card>
          )}

          {data.summary.overdueInvoices > 0 && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">
                  Overdue Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {data.summary.overdueInvoices}
                </div>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Invoices past due date
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest financial activities in your business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentTransactions.length > 0 ? (
                data.recentTransactions.map((transaction) => {
                  const Icon = getDocumentIcon(transaction.type)
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{transaction.docNum}</p>
                            {getStatusBadge(transaction.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {transaction.businessPartner} • {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                        <p className="text-xs text-muted-foreground">{transaction.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent transactions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Documents awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.pendingApprovals.length > 0 ? (
                data.pendingApprovals.map((approval) => (
                  <div key={approval.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{approval.docNum}</p>
                      {getPriorityBadge(approval.priority)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {approval.requestor} • {formatCurrency(approval.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(approval.date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Customers
            </CardTitle>
            <CardDescription>Your best performing customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topCustomers.length > 0 ? (
                data.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last order: {new Date(customer.lastOrder).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(customer.totalSales)}</p>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No customer data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Alerts
            </CardTitle>
            <CardDescription>Items that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.inventoryAlerts.length > 0 ? (
                data.inventoryAlerts.map((alert, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{alert.itemName}</p>
                      <Badge variant="secondary" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current: {alert.currentStock} • Reorder: {alert.reorderPoint}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Location: {alert.location}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All inventory levels are healthy</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GL Accounts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.quickStats.totalGlAccounts}</div>
            <Button variant="link" size="sm" className="p-0 h-auto" asChild>
              <Link href={`/${businessUnitId}/financials/chart-of-accounts`}>
                View Chart of Accounts
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.quickStats.totalBankAccounts}</div>
            <Button variant="link" size="sm" className="p-0 h-auto" asChild>
              <Link href={`/${businessUnitId}/financials/banks`}>
                Manage Banks
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.quickStats.totalMenuItems}</div>
            <Button variant="link" size="sm" className="p-0 h-auto" asChild>
              <Link href={`/${businessUnitId}/pos/menu`}>
                Manage Menu
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">POS Terminals</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.quickStats.activePosTerminals}</div>
            <Button variant="link" size="sm" className="p-0 h-auto" asChild>
              <Link href={`/${businessUnitId}/pos/terminals`}>
                Manage Terminals
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" asChild>
              <Link href={`/${businessUnitId}/purchasing/requests/new`}>
                <FileText className="h-6 w-6" />
                <span className="text-sm">New Purchase Request</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" asChild>
              <Link href={`/${businessUnitId}/financials/journal-entries`}>
                <FileText className="h-6 w-6" />
                <span className="text-sm">Create Journal Entry</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" asChild>
              <Link href={`/${businessUnitId}/inventory/stock`}>
                <Package className="h-6 w-6" />
                <span className="text-sm">Check Stock Levels</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" asChild>
              <Link href={`/${businessUnitId}/financials/reports`}>
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm">Financial Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage