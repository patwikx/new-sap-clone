"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Calculator,
  DollarSign,
  RefreshCw
} from "lucide-react"
import { useOrderAccounting } from "@/lib/hooks/use-accounting"

interface AccountingStatusCardProps {
  orderId: string
  businessUnitId: string
  showPostButton?: boolean
}

export function AccountingStatusCard({ 
  orderId, 
  businessUnitId, 
  showPostButton = true 
}: AccountingStatusCardProps) {
  const { summary, loading, posting, fetchSummary, postToGl } = useOrderAccounting(
    orderId, 
    businessUnitId
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Loading accounting information...
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
          Failed to load accounting information
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = () => {
    if (summary.isPosted) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Posted to GL
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Not Posted
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Accounting Status
            </CardTitle>
            <CardDescription>
              General Ledger posting information for this order
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount:</span>
              <span className="text-red-600">-{formatCurrency(summary.discount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>{formatCurrency(summary.tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>{formatCurrency(summary.totalAmount)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">AR Invoice:</span>
              <div className="font-mono text-xs">
                {summary.arInvoiceId || "Not created"}
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Journal Entry:</span>
              <div className="font-mono text-xs">
                {summary.journalEntryId || "Not created"}
              </div>
            </div>
          </div>
        </div>

        {/* Journal Lines */}
        {summary.journalLines.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Journal Entry Lines
            </h4>
            <div className="border rounded-md">
              <div className="grid grid-cols-12 gap-2 p-2 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-2">Account</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-3 text-right">Debit</div>
                <div className="col-span-3 text-right">Credit</div>
              </div>
              {summary.journalLines.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 p-2 text-xs border-b last:border-b-0">
                  <div className="col-span-2 font-mono">{line.accountCode}</div>
                  <div className="col-span-4 truncate">{line.description}</div>
                  <div className="col-span-3 text-right">
                    {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                  </div>
                  <div className="col-span-3 text-right">
                    {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-12 gap-2 p-2 text-xs font-medium bg-muted">
                <div className="col-span-6">Totals:</div>
                <div className="col-span-3 text-right">
                  {formatCurrency(summary.journalLines.reduce((sum, line) => sum + line.debit, 0))}
                </div>
                <div className="col-span-3 text-right">
                  {formatCurrency(summary.journalLines.reduce((sum, line) => sum + line.credit, 0))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {showPostButton && !summary.isPosted && (
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={fetchSummary} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={postToGl} disabled={posting}>
              {posting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Post to GL
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}