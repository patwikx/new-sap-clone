"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"
import { useParams } from "next/navigation"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Plus, Trash2, Calculator } from "lucide-react"

const journalLineSchema = z.object({
  glAccountId: z.string().min(1, "GL Account is required"),
  description: z.string().min(1, "Description is required"),
  debit: z.string().optional(),
  credit: z.string().optional(),
}).refine((data) => {
  const hasDebit = data.debit && parseFloat(data.debit) > 0
  const hasCredit = data.credit && parseFloat(data.credit) > 0
  return (hasDebit && !hasCredit) || (!hasDebit && hasCredit)
}, {
  message: "Each line must have either a debit or credit amount (not both)",
  path: ["debit"]
})

const editJournalEntrySchema = z.object({
  documentDate: z.string().min(1, "Document date is required"),
  postingDate: z.string().min(1, "Posting date is required"),
  reference: z.string().optional(),
  memo: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, "At least 2 journal lines are required")
}).refine((data) => {
  const totalDebits = data.lines.reduce((sum, line) => 
    sum + (line.debit ? parseFloat(line.debit) : 0), 0)
  const totalCredits = data.lines.reduce((sum, line) => 
    sum + (line.credit ? parseFloat(line.credit) : 0), 0)
  return Math.abs(totalDebits - totalCredits) < 0.01
}, {
  message: "Total debits must equal total credits",
  path: ["lines"]
})

interface GlAccount {
  id: string
  accountCode: string
  name: string
  normalBalance: string
}

interface JournalEntry {
  id: string
  docNum: string
  documentDate: string
  postingDate: string
  reference?: string
  memo?: string
  lines: {
    id: string
    glAccountId: string
    description: string
    debit?: number
    credit?: number
  }[]
}

interface EditJournalEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  entry: JournalEntry | null
}

export const EditJournalEntryModal = ({
  isOpen,
  onClose,
  onSuccess,
  entry
}: EditJournalEntryModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])

  const form = useForm<z.infer<typeof editJournalEntrySchema>>({
    resolver: zodResolver(editJournalEntrySchema),
    defaultValues: {
      documentDate: "",
      postingDate: "",
      reference: "",
      memo: "",
      lines: []
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines"
  })

  // Fetch reference data
  useEffect(() => {
    const fetchGlAccounts = async () => {
      try {
        const response = await axios.get(`/api/${businessUnitId}/gl-accounts`, {
          headers: { 'x-business-unit-id': businessUnitId }
        })
        setGlAccounts(response.data)
      } catch (error) {
        console.error("Failed to fetch GL accounts:", error)
      }
    }

    if (isOpen && businessUnitId) {
      fetchGlAccounts()
    }
  }, [isOpen, businessUnitId])

  useEffect(() => {
    if (entry && isOpen) {
      form.reset({
        documentDate: new Date(entry.documentDate).toISOString().split('T')[0],
        postingDate: new Date(entry.postingDate).toISOString().split('T')[0],
        reference: entry.reference || "",
        memo: entry.memo || "",
        lines: entry.lines.map(line => ({
          glAccountId: line.glAccountId,
          description: line.description,
          debit: line.debit?.toString() || "",
          credit: line.credit?.toString() || ""
        }))
      })
    }
  }, [entry, isOpen, form])

  // Calculate totals
  const lines = form.watch("lines")
  const totalDebits = lines.reduce((sum, line) => 
    sum + (line.debit ? parseFloat(line.debit) || 0 : 0), 0)
  const totalCredits = lines.reduce((sum, line) => 
    sum + (line.credit ? parseFloat(line.credit) || 0 : 0), 0)
  const difference = totalDebits - totalCredits
  const isBalanced = Math.abs(difference) < 0.01

  const onSubmit = async (values: z.infer<typeof editJournalEntrySchema>) => {
    if (!entry) return

    try {
      setLoading(true)
      
      await axios.patch(`/api/${businessUnitId}/journal-entries/${entry.id}`, values)

      toast.success("Journal entry updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update journal entry: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const addLine = () => {
    append({ glAccountId: "", description: "", debit: "", credit: "" })
  }

  const removeLine = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }

  if (!entry) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit Journal Entry - {entry.docNum}
          </DialogTitle>
          <DialogDescription>
            Update the journal entry details and line items.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entry Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="documentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posting Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Invoice #12345, Bank Transfer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="memo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memo</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional memo or notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Journal Lines */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Journal Lines</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={isBalanced ? "default" : "destructive"} className="gap-1">
                        <Calculator className="h-3 w-3" />
                        {isBalanced ? "Balanced" : "Out of Balance"}
                      </Badge>
                      {!isBalanced && (
                        <span className="text-sm text-muted-foreground">
                          Difference: {Math.abs(difference).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Line
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-3">GL Account</div>
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2">Debit</div>
                    <div className="col-span-2">Credit</div>
                    <div className="col-span-1">Action</div>
                  </div>

                  {/* Journal Lines */}
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.glAccountId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {glAccounts.map((account) => (
                                      <SelectItem key={account.id} value={account.id}>
                                        {account.accountCode} - {account.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Line description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.debit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  min="0" 
                                  placeholder="0.00" 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e)
                                    if (e.target.value) {
                                      form.setValue(`lines.${index}.credit`, "")
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.credit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  min="0" 
                                  placeholder="0.00" 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e)
                                    if (e.target.value) {
                                      form.setValue(`lines.${index}.debit`, "")
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                          disabled={fields.length <= 2}
                          className="h-9 w-9 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  {/* Totals Row */}
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium bg-muted/50 p-3 rounded-md">
                    <div className="col-span-7 flex items-center">
                      <span>Totals:</span>
                    </div>
                    <div className="col-span-2 text-right">
                      {totalDebits.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right">
                      {totalCredits.toFixed(2)}
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !isBalanced}>
                {loading ? "Updating..." : "Update Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}