"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Download, Printer } from "lucide-react"

interface ReportFiltersProps {
  onFiltersChange: (filters: ReportFilters) => void
  onExport: (format: 'csv' | 'pdf') => void
  onPrint: () => void
  showDateRange?: boolean
  showPeriod?: boolean
  showComparison?: boolean
}

export interface ReportFilters {
  startDate?: string
  endDate?: string
  accountingPeriodId?: string
  comparisonPeriodId?: string
  includeZeroBalances?: boolean
}

export const ReportFilters = ({
  onFiltersChange,
  onExport,
  onPrint,
  showDateRange = true,
  showPeriod = true,
  showComparison = false
}: ReportFiltersProps) => {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeZeroBalances: false
  })

  const updateFilters = (newFilters: Partial<ReportFilters>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    onFiltersChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Report Filters
        </CardTitle>
        <CardDescription>Configure report parameters and export options</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Date Range */}
          {showDateRange && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilters({ startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilters({ endDate: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Period Selection */}
          {showPeriod && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Accounting Period</label>
              <Select onValueChange={(value) => updateFilters({ accountingPeriodId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select accounting period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Period</SelectItem>
                  <SelectItem value="previous">Previous Period</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comparison Period */}
          {showComparison && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Compare With</label>
              <Select onValueChange={(value) => updateFilters({ comparisonPeriodId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select comparison period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous-year">Previous Year</SelectItem>
                  <SelectItem value="previous-quarter">Previous Quarter</SelectItem>
                  <SelectItem value="previous-month">Previous Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Options */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeZero"
              checked={filters.includeZeroBalances}
              onChange={(e) => updateFilters({ includeZeroBalances: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="includeZero" className="text-sm">Include zero balances</label>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onExport('csv')} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => onExport('pdf')} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}