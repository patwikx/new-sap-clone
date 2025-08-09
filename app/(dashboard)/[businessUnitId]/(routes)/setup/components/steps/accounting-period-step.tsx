'use client'

import { UseFormReturn } from 'react-hook-form'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FinancialSetupValues } from '@/lib/validations/financial-setup-schema'

interface AccountingPeriodsStepProps {
  form: UseFormReturn<FinancialSetupValues>
  onNext: () => void
  onPrevious: () => void
}

export function AccountingPeriodsStep({ form, onNext, onPrevious }: AccountingPeriodsStepProps) {
  const periods = form.watch('periods')
  const fiscalYear = form.watch('fiscalYear')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generated Accounting Periods</CardTitle>
          <CardDescription>
            Based on your fiscal year settings, the following accounting periods will be created:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Fiscal Year:</span> {fiscalYear.fiscalYear}
              </div>
              <div>
                <span className="font-medium">Start Date:</span> {format(fiscalYear.startDate, 'PPP')}
              </div>
              <div>
                <span className="font-medium">Period Type:</span>
                <Badge variant="secondary" className="ml-2">
                  {fiscalYear.periodType}
                </Badge>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Period Number</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{period.name}</TableCell>
                  <TableCell>{format(period.startDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(period.endDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{period.periodNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{period.type}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button onClick={onNext}>
          Next: Chart of Accounts
        </Button>
      </div>
    </div>
  )
}