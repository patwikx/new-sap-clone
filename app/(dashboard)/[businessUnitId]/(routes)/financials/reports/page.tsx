"use client"

import { useState } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Building2, 
  Users, 
  Package, 
  Banknote,
  Calculator,
  TrendingUp,
} from "lucide-react"
import { ReportFilters, type ReportFilters as ReportFiltersType } from "./components/report-filter"
import { BalanceSheet } from "./components/balance-sheet"
import { ProfitLoss } from "./components/profit-loss"
import { TrialBalance } from "./components/trial-balance"
import { ARAging } from "./components/ar-aging"
import { APAging } from "./components/ap-aging"
import { CashFlow } from "./components/cash-flow"
import { GLAccountBalances } from "./components/gl-account-balances"
import { InventoryValuation } from "./components/inventory-valuation"
import { toast } from "sonner"

const FinancialReportsPage = () => {
  const [filters, setFilters] = useState<ReportFiltersType>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeZeroBalances: false
  })

  const handleExport = (format: 'csv' | 'pdf') => {
    const activeTab = document.querySelector('[data-state="active"]')?.getAttribute('value')
    if (!activeTab) {
        toast.error("Could not find the active report to export.");
        return;
    }
    const reportElement = document.getElementById(`${activeTab}-report`)
    
    if (format === 'csv') {
      exportToCSV(activeTab, reportElement)
    } else {
      exportToPDF(activeTab, reportElement)
    }
  }

  const handlePrint = () => {
    const activeTab = document.querySelector('[data-state="active"]')?.getAttribute('value')
    if (!activeTab) {
        toast.error("Could not find the active report to print.");
        return;
    }
    const reportElement = document.getElementById(`${activeTab}-report`)
    
    if (reportElement) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Financial Report - ${activeTab}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .currency { text-align: right; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              ${reportElement.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const exportToCSV = (reportType: string | null, element: Element | null) => {
    if (!element) {
      toast.error("No report data to export")
      return
    }

    // This is a simplified implementation - you might want to enhance this
    const tables = element.querySelectorAll('table, [role="table"]')
    let csvContent = `Financial Report: ${reportType}\n`
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`

    tables.forEach((table) => {
      // Extract table data and convert to CSV format
      // Implementation would depend on the specific table structure
    })

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success("Report exported to CSV")
  }

  const exportToPDF = (reportType: string | null, element: Element | null) => {
    if (!element) {
      toast.error("No report data to export")
      return
    }

    // For PDF export, you would typically use a library like jsPDF or Puppeteer
    toast.info("PDF export functionality will be implemented with a PDF library")
  }

  const reportTabs = [
    {
      value: "balance-sheet",
      label: "Balance Sheet",
      icon: Building2,
      description: "Statement of Financial Position",
      component: <BalanceSheet filters={filters} />
    },
    {
      value: "profit-loss",
      label: "P&L Statement",
      icon: TrendingUp,
      description: "Income Statement",
      component: <ProfitLoss filters={filters} />
    },
    {
      value: "cash-flow",
      label: "Cash Flow",
      icon: Banknote,
      description: "Cash Flow Statement",
      component: <CashFlow filters={filters} />
    },
    {
      value: "trial-balance",
      label: "Trial Balance",
      icon: Calculator,
      description: "All Account Balances",
      component: <TrialBalance filters={filters} />
    },
    {
      value: "gl-balances",
      label: "GL Balances",
      icon: FileText,
      description: "General Ledger Account Balances",
      component: <GLAccountBalances filters={filters} />
    },
    {
      value: "ar-aging",
      label: "A/R Aging",
      icon: Users,
      description: "Accounts Receivable Aging",
      component: <ARAging filters={filters} />
    },
    {
      value: "ap-aging",
      label: "A/P Aging",
      icon: Building2,
      description: "Accounts Payable Aging",
      component: <APAging filters={filters} />
    },
    {
      value: "inventory-valuation",
      label: "Inventory Valuation",
      icon: Package,
      description: "Stock Valuation Report",
      component: <InventoryValuation filters={filters} />
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">
            Generate comprehensive financial reports for analysis and compliance
          </p>
        </div>
      </div>

      {/* Report Filters */}
      <ReportFilters
        onFiltersChange={setFilters}
        onExport={handleExport}
        onPrint={handlePrint}
        showDateRange={true}
        showPeriod={true}
        showComparison={false}
      />

      {/* Reports Tabs */}
      <Tabs defaultValue="balance-sheet" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {reportTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {reportTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
            </Card>
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default FinancialReportsPage
