"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, TrendingUp, TrendingDown } from "lucide-react"
import axios from "axios"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { ReportFilters } from "./report-filter"

interface BalanceSheetData {
  asOfDate: string
  assets: {
    currentAssets: AccountGroup[]
    nonCurrentAssets: AccountGroup[]
    totalAssets: number
  }
  liabilities: {
    currentLiabilities: AccountGroup[]
    nonCurrentLiabilities: AccountGroup[]
    totalLiabilities: number
  }
  equity: {
    accounts: AccountGroup[]
    totalEquity: number
  }
}

interface AccountGroup {
  name: string
  accounts: {
    accountCode: string
    name: string
    balance: number
  }[]
  total: number
}

interface BalanceSheetProps {
  filters: ReportFilters
}

export const BalanceSheet = ({ filters }: BalanceSheetProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBalanceSheet()
  }, [filters])

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/reports/balance-sheet`, {
        headers: { 'x-business-unit-id': businessUnitId },
        params: filters
      })
      setData(response.data)
    } catch (error) {
      toast.error("Failed to fetch balance sheet data")
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

  const AccountGroupSection = ({ group, level = 0 }: { group: AccountGroup; level?: number }) => (
    <div className={`space-y-2 ${level > 0 ? 'ml-4' : ''}`}>
      <div className="flex justify-between items-center font-medium">
        <span className="text-sm">{group.name}</span>
        <span className="text-sm">{formatCurrency(group.total)}</span>
      </div>
      {group.accounts.map((account) => (
        <div key={account.accountCode} className="flex justify-between items-center text-sm text-muted-foreground ml-4">
          <span>{account.accountCode} - {account.name}</span>
          <span>{formatCurrency(account.balance)}</span>
        </div>
      ))}
    </div>
  )

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
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No data available</h3>
            <p className="text-muted-foreground">Adjust your filters and try again</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalEquityAndLiabilities = data.liabilities.totalLiabilities + data.equity.totalEquity
  const isBalanced = Math.abs(data.assets.totalAssets - totalEquityAndLiabilities) < 0.01

  return (
    <div className="space-y-6" id="balance-sheet-report">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Balance Sheet</h1>
        <p className="text-muted-foreground">As of {new Date(data.asOfDate).toLocaleDateString()}</p>
        <div className="flex justify-center">
          <Badge variant={isBalanced ? "default" : "destructive"} className="gap-1">
            {isBalanced ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isBalanced ? "Balanced" : "Out of Balance"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Assets */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base border-b pb-1">Current Assets</h3>
              {data.assets.currentAssets.map((group, index) => (
                <AccountGroupSection key={index} group={group} />
              ))}
            </div>

            {/* Non-Current Assets */}
            {data.assets.nonCurrentAssets.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-base border-b pb-1">Non-Current Assets</h3>
                {data.assets.nonCurrentAssets.map((group, index) => (
                  <AccountGroupSection key={index} group={group} />
                ))}
              </div>
            )}

            <Separator />
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Assets</span>
              <span>{formatCurrency(data.assets.totalAssets)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Liabilities & Equity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Liabilities */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base border-b pb-1">Current Liabilities</h3>
              {data.liabilities.currentLiabilities.map((group, index) => (
                <AccountGroupSection key={index} group={group} />
              ))}
            </div>

            {/* Non-Current Liabilities */}
            {data.liabilities.nonCurrentLiabilities.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-base border-b pb-1">Non-Current Liabilities</h3>
                {data.liabilities.nonCurrentLiabilities.map((group, index) => (
                  <AccountGroupSection key={index} group={group} />
                ))}
              </div>
            )}

            <div className="flex justify-between items-center font-semibold">
              <span>Total Liabilities</span>
              <span>{formatCurrency(data.liabilities.totalLiabilities)}</span>
            </div>

            <Separator />

            {/* Equity */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base border-b pb-1">Equity</h3>
              {data.equity.accounts.map((group, index) => (
                <AccountGroupSection key={index} group={group} />
              ))}
            </div>

            <div className="flex justify-between items-center font-semibold">
              <span>Total Equity</span>
              <span>{formatCurrency(data.equity.totalEquity)}</span>
            </div>

            <Separator />
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Liabilities & Equity</span>
              <span>{formatCurrency(totalEquityAndLiabilities)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}