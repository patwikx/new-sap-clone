'use client'

import { useState } from 'react'
import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { FinancialSetupValues } from '@/lib/validations/financial-setup-schema'

interface ChartOfAccountsStepProps {
  form: UseFormReturn<FinancialSetupValues>
  onNext: () => void
  onPrevious: () => void
}

// Default account types that should be pre-seeded
const ACCOUNT_TYPES = [
  { id: 'ASSET', name: 'Asset' },
  { id: 'LIABILITY', name: 'Liability' },
  { id: 'EQUITY', name: 'Equity' },
  { id: 'REVENUE', name: 'Revenue' },
  { id: 'EXPENSE', name: 'Expense' },
] as const

// Default categories for Philippine businesses
const DEFAULT_CATEGORIES = [
  { code: 'CASH', name: 'Cash and Cash Equivalents' },
  { code: 'AR', name: 'Accounts Receivable' },
  { code: 'INV', name: 'Inventory' },
  { code: 'PPE', name: 'Property, Plant & Equipment' },
  { code: 'AP', name: 'Accounts Payable' },
  { code: 'TAX', name: 'Tax Liabilities' },
  { code: 'EQUITY', name: 'Owner\'s Equity' },
  { code: 'SALES', name: 'Sales Revenue' },
  { code: 'COGS', name: 'Cost of Goods Sold' },
  { code: 'OPEX', name: 'Operating Expenses' },
]

// Default control accounts for Philippine businesses
const DEFAULT_CONTROL_ACCOUNTS = [
  { accountCode: '1000', name: 'Cash on Hand', accountTypeId: 'ASSET', accountCategoryId: 'CASH' },
  { accountCode: '1010', name: 'Cash in Bank', accountTypeId: 'ASSET', accountCategoryId: 'CASH' },
  { accountCode: '1100', name: 'Accounts Receivable', accountTypeId: 'ASSET', accountCategoryId: 'AR' },
  { accountCode: '1200', name: 'Inventory', accountTypeId: 'ASSET', accountCategoryId: 'INV' },
  { accountCode: '1405', name: 'Input VAT', accountTypeId: 'ASSET', accountCategoryId: 'TAX' },
  { accountCode: '2000', name: 'Accounts Payable', accountTypeId: 'LIABILITY', accountCategoryId: 'AP' },
  { accountCode: '2105', name: 'VAT Output Payable', accountTypeId: 'LIABILITY', accountCategoryId: 'TAX' },
  { accountCode: '3000', name: 'Owner\'s Equity', accountTypeId: 'EQUITY', accountCategoryId: 'EQUITY' },
  { accountCode: '4000', name: 'Sales Revenue', accountTypeId: 'REVENUE', accountCategoryId: 'SALES' },
  { accountCode: '5000', name: 'Cost of Goods Sold', accountTypeId: 'EXPENSE', accountCategoryId: 'COGS' },
  { accountCode: '6000', name: 'Operating Expenses', accountTypeId: 'EXPENSE', accountCategoryId: 'OPEX' },
]

export function ChartOfAccountsStep({ form, onNext, onPrevious }: ChartOfAccountsStepProps) {
  const [useDefaults, setUseDefaults] = useState(true)

  const categoriesArray = useFieldArray({
    control: form.control,
    name: 'chartOfAccounts.categories',
  })

  const controlAccountsArray = useFieldArray({
    control: form.control,
    name: 'chartOfAccounts.controlAccounts',
  })

  const handleUseDefaults = () => {
    if (useDefaults) {
      // Set default categories
      form.setValue('chartOfAccounts.categories', DEFAULT_CATEGORIES)
      
      // Set default control accounts
      form.setValue('chartOfAccounts.controlAccounts', DEFAULT_CONTROL_ACCOUNTS)
    } else {
      // Clear all
      form.setValue('chartOfAccounts.categories', [])
      form.setValue('chartOfAccounts.controlAccounts', [])
    }
  }

  const addCategory = () => {
    categoriesArray.append({ code: '', name: '' })
  }

  const addControlAccount = () => {
    controlAccountsArray.append({
      accountCode: '',
      name: '',
      accountTypeId: '',
      accountCategoryId: '',
    })
  }

  const categories = form.watch('chartOfAccounts.categories')

  return (
    <Form {...form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Chart of Accounts Setup</CardTitle>
            <CardDescription>
              Set up your account categories and control accounts. You can use our Philippine business defaults or create your own.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-6">
              <Button
                type="button"
                variant={useDefaults ? "default" : "outline"}
                onClick={() => {
                  setUseDefaults(true)
                  handleUseDefaults()
                }}
              >
                Use Philippine Defaults
              </Button>
              <Button
                type="button"
                variant={!useDefaults ? "default" : "outline"}
                onClick={() => {
                  setUseDefaults(false)
                  handleUseDefaults()
                }}
              >
                Custom Setup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Account Categories</CardTitle>
                <CardDescription>
                  Categories help organize your chart of accounts
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoriesArray.fields.map((field, index) => (
                <div key={field.id} className="flex items-end space-x-4">
                  <FormField
                    control={form.control}
                    name={`chartOfAccounts.categories.${index}.code`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., CASH" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`chartOfAccounts.categories.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-[2]">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Cash and Cash Equivalents" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => categoriesArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Control Accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Control Accounts</CardTitle>
                <CardDescription>
                  Main accounts that will be used throughout the system
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addControlAccount}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {controlAccountsArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name={`chartOfAccounts.controlAccounts.${index}.accountCode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 1000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`chartOfAccounts.controlAccounts.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Cash on Hand" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`chartOfAccounts.controlAccounts.${index}.accountTypeId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ACCOUNT_TYPES.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`chartOfAccounts.controlAccounts.${index}.accountCategoryId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.code} value={category.code}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => controlAccountsArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button onClick={onNext}>
            Next: Numbering Series
          </Button>
        </div>
      </div>
    </Form>
  )
}