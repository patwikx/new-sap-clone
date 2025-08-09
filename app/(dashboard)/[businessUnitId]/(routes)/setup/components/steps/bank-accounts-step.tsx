'use client'

import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FinancialSetupValues } from '@/lib/validations/financial-setup-schema'

interface BankAccountsStepProps {
  form: UseFormReturn<FinancialSetupValues>
  onNext: () => void
  onPrevious: () => void
}

const PHILIPPINE_BANKS = [
  'BDO Unibank, Inc.',
  'Bank of the Philippine Islands (BPI)',
  'Metropolitan Bank & Trust Company (Metrobank)',
  'Land Bank of the Philippines',
  'Philippine National Bank (PNB)',
  'Development Bank of the Philippines (DBP)',
  'Security Bank Corporation',
  'China Banking Corporation (Chinabank)',
  'Rizal Commercial Banking Corporation (RCBC)',
  'UnionBank of the Philippines',
  'EastWest Bank',
  'Philippine Savings Bank (PSBank)',
  'Maybank Philippines',
  'HSBC Philippines',
  'Standard Chartered Bank Philippines',
  'Other',
] as const

export function BankAccountsStep({ form, onNext, onPrevious }: BankAccountsStepProps) {
  const bankAccountsArray = useFieldArray({
    control: form.control,
    name: 'bankAccounts',
  })

  const controlAccounts = form.watch('chartOfAccounts.controlAccounts')
  const cashAccounts = controlAccounts.filter(account => 
    account.accountCategoryId === 'CASH' || account.name.toLowerCase().includes('cash')
  )

  const addBankAccount = () => {
    bankAccountsArray.append({
      name: '',
      bankName: '',
      accountNumber: '',
      glAccountId: '',
    })
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>
                  Set up your bank accounts and link them to your chart of accounts. This is optional but recommended for proper cash management.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addBankAccount}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {bankAccountsArray.fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Bank Account {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => bankAccountsArray.remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`bankAccounts.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Operating Account PHP" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`bankAccounts.${index}.bankName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select bank" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PHILIPPINE_BANKS.map((bank) => (
                                <SelectItem key={bank} value={bank}>
                                  {bank}
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
                      name={`bankAccounts.${index}.accountNumber`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 007490123456" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`bankAccounts.${index}.glAccountId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link to G/L Account</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select G/L account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cashAccounts.map((account) => (
                                <SelectItem key={account.accountCode} value={account.name}>
                                  {account.accountCode} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              {bankAccountsArray.fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No bank accounts configured. Click &quot;Add Bank Account&quot; to get started.
                  <br />
                  <span className="text-sm">You can skip this step and add bank accounts later.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button onClick={onNext}>
            Next: Review
          </Button>
        </div>
      </div>
    </Form>
  )
}