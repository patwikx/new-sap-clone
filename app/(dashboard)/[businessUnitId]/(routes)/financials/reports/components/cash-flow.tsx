"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Banknote, TrendingUp, TrendingDown } from "lucide-react"
import { ReportFilters } from "./report-filter"
import axios from "axios"
import { useParams } from "next/navigation"
import { toast } from "sonner"

interface CashFlowData {
  period: string
  operatingActivities: {
    netIncome: number
    adjustments: CashFlowItem[]
    workingCapitalChanges: CashFlowItem[]
    netCashFromOperating: number
  }
  investingActivities: {
    items: CashFlowItem[]
    netCashFromInvesting: number
  }
  financingActivities: {
    items: CashFlowItem[]
    netCashFromFinancing: number
  }
  netCashFlow: number
  beginningCash: number
  endingCash: number
}

interface CashFlowItem {
  description: string
  amount: number
  isInflow: boolean
}

interface CashFlowProps {
  filters: ReportFilters
}

export const CashFlow = ({ filters }: CashFlowProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCashFlow()
  }, [filters])

  const fetchCashFlow = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/reports/cash-flow`, {
        headers: { 'x-business-unit-id': businessUnitId },
        params: filters
      })
      setData(response.data)
    } catch (error) {
      toast.error("Failed to fetch cash flow data")
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

  const CashFlowSection = ({ title, items, total }: { title: string; items: CashFlowItem[]; total: number }) => (
    <div className="space-y-3">
      <h3 className="font-semibold text-base border-b pb-2">{title}</h3>
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="text-sm">{item.description}</span>
          <span className={`text-sm font-medium ${item.isInflow ? 'text-green-600' : 'text-red-600'}`}>
            {item.isInflow ? '' : '('}{formatCurrency(Math.abs(item.amount))}{item.isInflow ? '' : ')'}
          </span>
        </div>
      ))}
      <div className="flex justify-between items-center font-semibold text-base border-t pt-2">
        <span>Net Cash from {title}</span>
        <span className={total >= 0 ? "text-green-600" : "text-red-600"}>
          {formatCurrency(total)}
        </span>
      </div>
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
            <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No data available</h3>
            <p className="text-muted-foreground">Adjust your filters and try again</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" id="cash-flow-report">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
        <p className="text-muted-foreground">{data.period}</p>
        <div className="flex justify-center">
          <Badge variant={data.netCashFlow >= 0 ? "default" : "destructive"} className="gap-1">
            {data.netCashFlow >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            Net Cash Flow: {formatCurrency(data.netCashFlow)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Operating Activities */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">Cash Flows from Operating Activities</h3>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Net Income</span>
              <span className="text-sm font-medium">{formatCurrency(data.operatingActivities.netIncome)}</span>
            </div>

            {/* Adjustments */}
            {data.operatingActivities.adjustments.map((item, index) => (
              <div key={index} className="flex justify-between items-center ml-4">
                <span className="text-sm">{item.description}</span>
                <span className={`text-sm font-medium ${item.isInflow ? 'text-green-600' : 'text-red-600'}`}>
                  {item.isInflow ? '' : '('}{formatCurrency(Math.abs(item.amount))}{item.isInflow ? '' : ')'}
                </span>
              </div>
            ))}

            {/* Working Capital Changes */}
            {data.operatingActivities.workingCapitalChanges.map((item, index) => (
              <div key={index} className="flex justify-between items-center ml-4">
                <span className="text-sm">{item.description}</span>
                <span className={`text-sm font-medium ${item.isInflow ? 'text-green-600' : 'text-red-600'}`}>
                  {item.isInflow ? '' : '('}{formatCurrency(Math.abs(item.amount))}{item.isInflow ? '' : ')'}
                </span>
              </div>
            ))}

            <div className="flex justify-between items-center font-semibold text-base border-t pt-2">
              <span>Net Cash from Operating Activities</span>
              <span className={data.operatingActivities.netCashFromOperating >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(data.operatingActivities.netCashFromOperating)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Investing Activities */}
          <CashFlowSection
            title="Investing Activities"
            items={data.investingActivities.items}
            total={data.investingActivities.netCashFromInvesting}
          />

          <Separator />

          {/* Financing Activities */}
          <CashFlowSection
            title="Financing Activities"
            items={data.financingActivities.items}
            total={data.financingActivities.netCashFromFinancing}
          />

          <Separator />

          {/* Net Cash Flow Summary */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-md">
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Net Increase (Decrease) in Cash</span>
              <span className={data.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(data.netCashFlow)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Cash at Beginning of Period</span>
              <span>{formatCurrency(data.beginningCash)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
              <span>Cash at End of Period</span>
              <span>{formatCurrency(data.endingCash)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}