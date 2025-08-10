"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Calculator } from "lucide-react"
import { ReportFilters } from "./report-filter"
import axios from "axios"
import { useParams } from "next/navigation"
import { toast } from "sonner"

interface TrialBalanceData {
  asOfDate: string
  accounts: TrialBalanceAccount[]
  totals: {
    totalDebits: number
    totalCredits: number
    isBalanced: boolean
  }
}

interface TrialBalanceAccount {
  accountCode: string
  accountName: string
  accountType: string
  debitBalance: number
  creditBalance: number
}

interface TrialBalanceProps {
  filters: ReportFilters
}

export const TrialBalance = ({ filters }: TrialBalanceProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const [data, setData] = useState<TrialBalanceData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTrialBalance()
  }, [filters])

  const fetchTrialBalance = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/reports/trial-balance`, {
        headers: { 'x-business-unit-id': businessUnitId },
        params: filters
      })
      setData(response.data)
    } catch (error) {
      toast.error("Failed to fetch trial balance data")
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
    <div className="space-y-6" id="trial-balance-report">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Trial Balance</h1>
        <p className="text-muted-foreground">As of {new Date(data.asOfDate).toLocaleDateString()}</p>
        <div className="flex justify-center">
          <Badge variant={data.totals.isBalanced ? "default" : "destructive"} className="gap-1">
            <Calculator className="h-3 w-3" />
            {data.totals.isBalanced ? "Balanced" : "Out of Balance"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-3 mb-4">
            <div className="col-span-2">Account Code</div>
            <div className="col-span-4">Account Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Debit</div>
            <div className="col-span-2 text-right">Credit</div>
          </div>

          {/* Account Rows */}
          <div className="space-y-2">
            {data.accounts.map((account) => (
              <div key={account.accountCode} className="grid grid-cols-12 gap-2 items-center py-2 hover:bg-muted/50 rounded-md px-2">
                <div className="col-span-2 font-mono text-sm">{account.accountCode}</div>
                <div className="col-span-4 text-sm">{account.accountName}</div>
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

          <Separator className="my-4" />

          {/* Totals */}
          <div className="grid grid-cols-12 gap-2 items-center py-3 bg-muted/50 rounded-md px-2 font-bold">
            <div className="col-span-8 text-lg">Total</div>
            <div className="col-span-2 text-right text-lg">
              {formatCurrency(data.totals.totalDebits)}
            </div>
            <div className="col-span-2 text-right text-lg">
              {formatCurrency(data.totals.totalCredits)}
            </div>
          </div>

          {/* Balance Check */}
          <div className="mt-4 p-3 rounded-md bg-muted/30">
            <div className="flex justify-between items-center text-sm">
              <span>Difference:</span>
              <span className={data.totals.isBalanced ? "text-green-600" : "text-red-600"}>
                {formatCurrency(Math.abs(data.totals.totalDebits - data.totals.totalCredits))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}