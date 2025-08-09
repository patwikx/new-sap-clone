'use client'

import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FinancialSetupValues } from '@/lib/validations/financial-setup-schema'
import { DocumentType } from '@prisma/client'

interface NumberingSeriesStepProps {
  form: UseFormReturn<FinancialSetupValues>
  onNext: () => void
  onPrevious: () => void
}

const DOCUMENT_TYPES = [
  { value: DocumentType.SALES_ORDER, label: 'Sales Order' },
  { value: DocumentType.DELIVERY, label: 'Delivery' },
  { value: DocumentType.AR_INVOICE, label: 'AR Invoice' },
  { value: DocumentType.PURCHASE_REQUEST, label: 'Purchase Request' },
  { value: DocumentType.PURCHASE_ORDER, label: 'Purchase Order' },
  { value: DocumentType.GOODS_RECEIPT_PO, label: 'Goods Receipt PO' },
  { value: DocumentType.AP_INVOICE, label: 'AP Invoice' },
  { value: DocumentType.JOURNAL_ENTRY, label: 'Journal Entry' },
  { value: DocumentType.INCOMING_PAYMENT, label: 'Incoming Payment' },
  { value: DocumentType.OUTGOING_PAYMENT, label: 'Outgoing Payment' },
] as const

const DEFAULT_NUMBERING_SERIES = [
  { name: 'Sales Order Series', prefix: 'SO-', nextNumber: 1, documentType: DocumentType.SALES_ORDER },
  { name: 'Delivery Series', prefix: 'DLV-', nextNumber: 1, documentType: DocumentType.DELIVERY },
  { name: 'AR Invoice Series', prefix: 'AR-', nextNumber: 1, documentType: DocumentType.AR_INVOICE },
  { name: 'Purchase Request Series', prefix: 'PR-', nextNumber: 1, documentType: DocumentType.PURCHASE_REQUEST },
  { name: 'Purchase Order Series', prefix: 'PO-', nextNumber: 1, documentType: DocumentType.PURCHASE_ORDER },
  { name: 'Goods Receipt Series', prefix: 'GR-', nextNumber: 1, documentType: DocumentType.GOODS_RECEIPT_PO },
  { name: 'AP Invoice Series', prefix: 'AP-', nextNumber: 1, documentType: DocumentType.AP_INVOICE },
  { name: 'Journal Entry Series', prefix: 'JE-', nextNumber: 1, documentType: DocumentType.JOURNAL_ENTRY },
  { name: 'Incoming Payment Series', prefix: 'IP-', nextNumber: 1, documentType: DocumentType.INCOMING_PAYMENT },
  { name: 'Outgoing Payment Series', prefix: 'OP-', nextNumber: 1, documentType: DocumentType.OUTGOING_PAYMENT },
]

export function NumberingSeriesStep({ form, onNext, onPrevious }: NumberingSeriesStepProps) {
  const numberingSeriesArray = useFieldArray({
    control: form.control,
    name: 'numberingSeries',
  })

  const handleUseDefaults = () => {
    form.setValue('numberingSeries', DEFAULT_NUMBERING_SERIES)
  }

  const addNumberingSeries = () => {
    numberingSeriesArray.append({
      name: '',
      prefix: '',
      nextNumber: 1,
      documentType: DocumentType.SALES_ORDER,
    })
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Document Numbering Series</CardTitle>
            <CardDescription>
              Configure how your documents will be numbered. Each document type should have its own numbering series.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleUseDefaults}
              >
                Use Default Series
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={addNumberingSeries}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Series
              </Button>
            </div>

            <div className="space-y-4">
              {numberingSeriesArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name={`numberingSeries.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Series Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Sales Order Series" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`numberingSeries.${index}.documentType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DOCUMENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                    name={`numberingSeries.${index}.prefix`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prefix</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., SO-" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`numberingSeries.${index}.nextNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starting Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => numberingSeriesArray.remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {numberingSeriesArray.fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No numbering series configured. Click &quot;Use Default Series&quot; or &quot;Add Series&quot; to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button onClick={onNext}>
            Next: Bank Accounts
          </Button>
        </div>
      </div>
    </Form>
  )
}