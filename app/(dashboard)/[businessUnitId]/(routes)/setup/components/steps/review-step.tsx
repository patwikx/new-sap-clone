'use client'

import { UseFormReturn } from 'react-hook-form'
import { format } from 'date-fns'
import { CheckCircle, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FinancialSetupValues } from '@/lib/validations/financial-setup-schema'

interface ReviewStepProps {
  form: UseFormReturn<FinancialSetupValues>
  onPrevious: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function ReviewStep({ form, onPrevious, onSubmit, isSubmitting }: ReviewStepProps) {
  const formData = form.getValues()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Setup</CardTitle>
          <CardDescription>
            Please review all the settings below before completing the setup. Once confirmed, your financial system will be initialized.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Fiscal Year Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            Fiscal Year Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Fiscal Year</span>
              <p className="text-lg font-semibold">{formData.fiscalYear.fiscalYear}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Start Date</span>
              <p className="text-lg font-semibold">{format(formData.fiscalYear.startDate, 'PPP')}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Period Type</span>
              <Badge variant="secondary">{formData.fiscalYear.periodType}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounting Periods Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            Accounting Periods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            {formData.periods.length} periods will be created
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {formData.periods.slice(0, 6).map((period, index) => (
              <div key={index} className="text-sm p-2 bg-muted rounded">
                {period.name}
              </div>
            ))}
            {formData.periods.length > 6 && (
              <div className="text-sm p-2 bg-muted rounded text-center">
                +{formData.periods.length - 6} more...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart of Accounts Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            Chart of Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Account Categories ({formData.chartOfAccounts.categories.length})</h4>
              <div className="space-y-1">
                {formData.chartOfAccounts.categories.map((category, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span>{category.code}</span>
                    <span className="text-muted-foreground">{category.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Control Accounts ({formData.chartOfAccounts.controlAccounts.length})</h4>
              <div className="space-y-1">
                {formData.chartOfAccounts.controlAccounts.slice(0, 5).map((account, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span>{account.accountCode}</span>
                    <span className="text-muted-foreground">{account.name}</span>
                  </div>
                ))}
                {formData.chartOfAccounts.controlAccounts.length > 5 && (
                  <div className="text-sm text-muted-foreground">
                    +{formData.chartOfAccounts.controlAccounts.length - 5} more accounts...
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Numbering Series Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            Numbering Series
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            {formData.numberingSeries.length} numbering series configured
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {formData.numberingSeries.map((series, index) => (
              <div key={index} className="text-sm p-2 bg-muted rounded flex justify-between">
                <span>{series.name}</span>
                <Badge variant="outline" className="text-xs">
                  {series.prefix}{series.nextNumber.toString().padStart(5, '0')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts Summary */}
      {formData.bankAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Bank Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.bankAccounts.map((bank, index) => (
                <div key={index} className="p-3 bg-muted rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{bank.name}</p>
                      <p className="text-sm text-muted-foreground">{bank.bankName}</p>
                      <p className="text-sm text-muted-foreground">Account: {bank.accountNumber}</p>
                    </div>
                    <Badge variant="outline">
                      {bank.glAccountId}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={isSubmitting}>
          Previous
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </div>
    </div>
  )
}