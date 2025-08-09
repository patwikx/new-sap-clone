'use client'

import { UseFormReturn } from 'react-hook-form'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { FinancialSetupValues } from '@/lib/validations/financial-setup-schema'
import { PeriodType } from '@prisma/client'

interface FiscalYearStepProps {
  form: UseFormReturn<FinancialSetupValues>
  onNext: () => void
}

export function FiscalYearStep({ form, onNext }: FiscalYearStepProps) {
  const handleNext = () => {
    const fiscalYearData = form.getValues('fiscalYear')
    
    // Generate periods based on fiscal year settings
    const periods = generateAccountingPeriods(
      fiscalYearData.fiscalYear,
      fiscalYearData.startDate,
      fiscalYearData.periodType
    )
    
    form.setValue('periods', periods)
    onNext()
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="fiscalYear.fiscalYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fiscal Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  The fiscal year for your business operations
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fiscalYear.startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fiscal Year Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date('1900-01-01')
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When does your fiscal year begin?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fiscalYear.periodType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={PeriodType.MONTHLY}>Monthly</SelectItem>
                  <SelectItem value={PeriodType.QUARTERLY}>Quarterly</SelectItem>
                  <SelectItem value={PeriodType.YEAR_END}>Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How do you want to divide your fiscal year into accounting periods?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button onClick={handleNext}>
            Next: Accounting Periods
          </Button>
        </div>
      </div>
    </Form>
  )
}

function generateAccountingPeriods(
  fiscalYear: number,
  startDate: Date,
  periodType: PeriodType
) {
  const periods = []
  const start = new Date(startDate)
  
  switch (periodType) {
    case PeriodType.MONTHLY:
      for (let i = 0; i < 12; i++) {
        const periodStart = new Date(start.getFullYear(), start.getMonth() + i, 1)
        const periodEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0)
        
        periods.push({
          name: `${fiscalYear} - ${format(periodStart, 'MMM')}`,
          startDate: periodStart,
          endDate: periodEnd,
          fiscalYear,
          periodNumber: i + 1,
          type: PeriodType.MONTHLY,
        })
      }
      break
      
    case PeriodType.QUARTERLY:
      for (let i = 0; i < 4; i++) {
        const periodStart = new Date(start.getFullYear(), start.getMonth() + (i * 3), 1)
        const periodEnd = new Date(start.getFullYear(), start.getMonth() + ((i + 1) * 3), 0)
        
        periods.push({
          name: `${fiscalYear} - Q${i + 1}`,
          startDate: periodStart,
          endDate: periodEnd,
          fiscalYear,
          periodNumber: i + 1,
          type: PeriodType.QUARTERLY,
        })
      }
      break
      
    case PeriodType.YEAR_END:
      const yearEnd = new Date(start.getFullYear() + 1, start.getMonth(), 0)
      periods.push({
        name: `${fiscalYear}`,
        startDate: start,
        endDate: yearEnd,
        fiscalYear,
        periodNumber: 1,
        type: PeriodType.YEAR_END,
      })
      break
  }
  
  return periods
}