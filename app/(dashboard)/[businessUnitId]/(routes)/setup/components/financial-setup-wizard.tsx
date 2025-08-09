'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  financialSetupSchema, 
  type FinancialSetupValues,
} from '@/lib/validations/financial-setup-schema'
import { createFinancialSetup } from '@/lib/actions/accounting-setup/financial-setup-actions'
import { FiscalYearStep } from './steps/fiscal-year-step'
import { AccountingPeriodsStep } from './steps/accounting-period-step'
import { ChartOfAccountsStep } from './steps/chart-of-accounts-step'
import { NumberingSeriesStep } from './steps/numbering-series-step'
import { BankAccountsStep } from './steps/bank-accounts-step'
import { ReviewStep } from './steps/review-step'

interface FinancialSetupWizardProps {
  businessUnitId: string
}

const STEPS = [
  { id: 'fiscal-year', title: 'Fiscal Year', description: 'Set up your fiscal year and period type' },
  { id: 'periods', title: 'Accounting Periods', description: 'Configure accounting periods' },
  { id: 'chart-of-accounts', title: 'Chart of Accounts', description: 'Set up account categories and control accounts' },
  { id: 'numbering-series', title: 'Numbering Series', description: 'Configure document numbering' },
  { id: 'bank-accounts', title: 'Bank Accounts', description: 'Set up your bank accounts' },
  { id: 'review', title: 'Review', description: 'Review and confirm your setup' },
] as const

type StepId = typeof STEPS[number]['id']

export function FinancialSetupWizard({ businessUnitId }: FinancialSetupWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<StepId>('fiscal-year')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FinancialSetupValues>({
    resolver: zodResolver(financialSetupSchema),
    defaultValues: {
      fiscalYear: {
        fiscalYear: new Date().getFullYear(),
        startDate: new Date(new Date().getFullYear(), 0, 1),
        periodType: 'MONTHLY',
      },
      periods: [],
      chartOfAccounts: {
        categories: [],
        controlAccounts: [],
      },
      numberingSeries: [],
      bankAccounts: [],
    },
  })

  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep)
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id)
    }
  }

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id)
    }
  }

  const handleSubmit = async (data: FinancialSetupValues) => {
    setIsSubmitting(true)
    try {
      const result = await createFinancialSetup(data, businessUnitId)
      
      if (result.success) {
        toast.success(result.message)
        router.push(`/${businessUnitId}/dashboard`)
      } else {
        toast.error(result.message)
        if (result.error) {
          // Handle field-specific errors
          Object.entries(result.error).forEach(([field, messages]) => {
            if (messages) {
              // ✅ FIX FOR THE ESLINT WARNING
              form.setError(field as keyof FinancialSetupValues, { message: messages[0] })
            }
          })
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Setup error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'fiscal-year':
        return <FiscalYearStep form={form} onNext={handleNext} />
      case 'periods':
        return <AccountingPeriodsStep form={form} onNext={handleNext} onPrevious={handlePrevious} />
      case 'chart-of-accounts':
        return <ChartOfAccountsStep form={form} onNext={handleNext} onPrevious={handlePrevious} />
      case 'numbering-series':
        return <NumberingSeriesStep form={form} onNext={handleNext} onPrevious={handlePrevious} />
      case 'bank-accounts':
        return <BankAccountsStep form={form} onNext={handleNext} onPrevious={handlePrevious} />
      case 'review':
        return (
          <ReviewStep 
            form={form} 
            onPrevious={handlePrevious} 
            onSubmit={form.handleSubmit(handleSubmit)}
            isSubmitting={isSubmitting}
          />
        )
      default:
        return null
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{STEPS[currentStepIndex].title}</CardTitle>
            <CardDescription>{STEPS[currentStepIndex].description}</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {STEPS.length}
          </div>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step, index) => (
              <span 
                key={step.id} 
                className={index <= currentStepIndex ? 'text-primary' : ''}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {renderStep()}
      </CardContent>
    </Card>
  )
}