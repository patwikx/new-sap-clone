"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import axios from "axios"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { ReportFilters } from "./report-filter"

interface ProfitLossData {
  period: string
  revenue: {
    accounts: RevenueAccount[]
    totalRevenue: number
  }
  expenses: {
    costOfSales: ExpenseAccount[]
    operatingExpenses: ExpenseAccount[]
    totalExpenses: number
  }
  grossProfit: number
  operatingProfit: number
  netProfit: number
  profitMargin: number
}

interface RevenueAccount {
  accountCode: string
  name: string
  amount: number
}

interface ExpenseAccount {
  accountCode: string
  name: string
  amount: number
}

interface ProfitLossProps {
  filters: ReportFilters
}

export const ProfitLoss = ({ filters }: ProfitLossProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const [data, setData] = useState<ProfitLossData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProfitLoss()
  }, [filters])

  const fetchProfitLoss = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/reports/profit-loss`, {
        headers: { 'x-business-unit-id': businessUnitId },
        params: filters
      })
      setData(response.data)
    } catch (error) {
      toast.error("Failed to fetch profit & loss data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

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
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No data available</h3>
            <p className="text-muted-foreground">Adjust your filters and try again</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" id="profit-loss-report">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
        <p className="text-muted-foreground">{data.period}</p>
        <div className="flex justify-center gap-2">
          <Badge variant={data.netProfit >= 0 ? "default" : "destructive"} className="gap-1">
            {data.netProfit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            Net {data.netProfit >= 0 ? "Profit" : "Loss"}: {formatCurrency(Math.abs(data.netProfit))}
          </Badge>
          <Badge variant="outline">
            Margin: {formatPercentage(data.profitMargin)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Revenue Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">Revenue</h3>
            {data.revenue.accounts.map((account) => (
              <div key={account.accountCode} className="flex justify-between items-center">
                <span className="text-sm">{account.accountCode} - {account.name}</span>
                <span className="text-sm font-medium">{formatCurrency(account.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center font-semibold text-base border-t pt-2">
              <span>Total Revenue</span>
              <span>{formatCurrency(data.revenue.totalRevenue)}</span>
            </div>
          </div>

          <Separator />

          {/* Cost of Sales */}
          {data.expenses.costOfSales.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Cost of Sales</h3>
              {data.expenses.costOfSales.map((account) => (
                <div key={account.accountCode} className="flex justify-between items-center">
                  <span className="text-sm">{account.accountCode} - {account.name}</span>
                  <span className="text-sm font-medium">({formatCurrency(account.amount)})</span>
                </div>
              ))}
              <div className="flex justify-between items-center font-semibold text-base border-t pt-2">
                <span>Gross Profit</span>
                <span className={data.grossProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(data.grossProfit)}
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Operating Expenses */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">Operating Expenses</h3>
            {data.expenses.operatingExpenses.map((account) => (
              <div key={account.accountCode} className="flex justify-between items-center">
                <span className="text-sm">{account.accountCode} - {account.name}</span>
                <span className="text-sm font-medium">({formatCurrency(account.amount)})</span>
              </div>
            ))}
            <div className="flex justify-between items-center font-semibold text-base border-t pt-2">
              <span>Total Operating Expenses</span>
              <span>({formatCurrency(data.expenses.totalExpenses)})</span>
            </div>
          </div>

          <Separator />

          {/* Net Profit */}
          <div className="space-y-3">
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Net {data.netProfit >= 0 ? "Profit" : "Loss"}</span>
              <span className={data.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(data.netProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Profit Margin</span>
              <span>{formatPercentage(data.profitMargin)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}