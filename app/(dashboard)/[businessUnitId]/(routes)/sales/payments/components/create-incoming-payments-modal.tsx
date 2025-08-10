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
import { Separator } from "@/components/ui/separator"
import { Banknote, Calculator, Plus, X } from "lucide-react"

const paymentApplicationSchema = z.object({
  arInvoiceId: z.string().min(1, "Invoice is required"),
  amountApplied: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number"
  }),
})

const createIncomingPaymentSchema = z.object({
  bpCode: z.string().min(1, "Customer is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  bankAccountId: z.string().min(1, "Bank account is required"),
  paymentMethodId: z.string().min(1, "Payment method is required"),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
  applications: z.array(paymentApplicationSchema).min(1, "At least one invoice application is required"),
})

interface BusinessPartner {
  id: string
  bpCode: string
  name: string
  type: string
}

interface BankAccount {
  id: string
  name: string
  bankName: string
  accountNumber: string
}

interface PaymentMethod {
  id: string
  name: string
}

interface ARInvoice {
  id: string
  docNum: string
  totalAmount: number
  amountPaid: number
  dueDate: string
  businessPartner: {
    name: string
  }
}

interface CreateIncomingPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateIncomingPaymentModal = ({
  isOpen,
  onClose,
  onSuccess
}: CreateIncomingPaymentModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<BusinessPartner[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [availableInvoices, setAvailableInvoices] = useState<ARInvoice[]>([])

  const form = useForm<z.infer<typeof createIncomingPaymentSchema>>({
    resolver: zodResolver(createIncomingPaymentSchema),
    defaultValues: {
      bpCode: "",
      paymentDate: new Date().toISOString().split('T')[0],
      bankAccountId: "",
      paymentMethodId: "",
      referenceNumber: "",
      remarks: "",
      applications: [{ arInvoiceId: "", amountApplied: "" }]
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "applications"
  })

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [customersRes, bankAccountsRes, paymentMethodsRes] = await Promise.all([
          axios.get(`/api/${businessUnitId}/business-partners?type=CUSTOMER`, {
            headers: { 'x-business-unit-id': businessUnitId }
          }),
          axios.get(`/api/${businessUnitId}/bank-accounts`, {
            headers: { 'x-business-unit-id': businessUnitId }
          }),
          axios.get(`/api/${businessUnitId}/payment-methods`, {
            headers: { 'x-business-unit-id': businessUnitId }
          })
        ])
        setCustomers(customersRes.data.filter((bp: BusinessPartner) => bp.type === 'CUSTOMER' || bp.type === 'BOTH'))
        setBankAccounts(bankAccountsRes.data)
        setPaymentMethods(paymentMethodsRes.data)
      } catch (error) {
        console.error("Failed to fetch reference data:", error)
      }
    }

    if (isOpen && businessUnitId) {
      fetchReferenceData()
    }
  }, [isOpen, businessUnitId])

  // Fetch customer invoices when customer changes
  const watchCustomer = form.watch("bpCode")
  useEffect(() => {
    const fetchCustomerInvoices = async () => {
      if (!watchCustomer) {
        setAvailableInvoices([])
        return
      }

      try {
        const response = await axios.get(`/api/${businessUnitId}/ar-invoices?customer=${watchCustomer}&status=OPEN`, {
          headers: { 'x-business-unit-id': businessUnitId }
        })
        setAvailableInvoices(response.data)
      } catch (error) {
        console.error("Failed to fetch customer invoices:", error)
      }
    }

    if (watchCustomer) {
      fetchCustomerInvoices()
    }
  }, [watchCustomer, businessUnitId])

  // Calculate total payment amount
  const applications = form.watch("applications")
  const totalPaymentAmount = applications.reduce((sum, app) => {
    return sum + (parseFloat(app.amountApplied) || 0)
  }, 0)

  const onSubmit = async (values: z.infer<typeof createIncomingPaymentSchema>) => {
    try {
      setLoading(true)
      
      await axios.post(`/api/${businessUnitId}/incoming-payments`, values, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("Incoming payment created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create incoming payment: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const addApplication = () => {
    append({ arInvoiceId: "", amountApplied: "" })
  }

  const removeApplication = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Create Incoming Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment received from a customer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bpCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.bpCode} value={customer.bpCode}>
                                {customer.bpCode} - {customer.name}
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
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bankAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bank account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} - {account.bankName}
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
                    name="paymentMethodId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Check number, transfer reference, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about the payment" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Invoice Applications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Apply to Invoices</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      <span className="text-sm text-muted-foreground">Total Payment:</span>
                      <span className="font-medium">₱{totalPaymentAmount.toLocaleString()}</span>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addApplication}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Invoice
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-5">Invoice</div>
                    <div className="col-span-2">Total Amount</div>
                    <div className="col-span-2">Outstanding</div>
                    <div className="col-span-2">Apply Amount</div>
                    <div className="col-span-1">Action</div>
                  </div>

                  {/* Payment Applications */}
                  {fields.map((field, index) => {
                    const selectedInvoice = availableInvoices.find(inv => 
                      inv.id === form.watch(`applications.${index}.arInvoiceId`)
                    )
                    const outstanding = selectedInvoice ? 
                      selectedInvoice.totalAmount - selectedInvoice.amountPaid : 0

                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-5">
                          <FormField
                            control={form.control}
                            name={`applications.${index}.arInvoiceId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select invoice" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableInvoices.map((invoice) => (
                                        <SelectItem key={invoice.id} value={invoice.id}>
                                          {invoice.docNum} - ₱{(invoice.totalAmount - invoice.amountPaid).toLocaleString()}
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

                        <div className="col-span-2 flex items-center justify-center h-9">
                          <span className="text-sm">
                            {selectedInvoice ? `₱${selectedInvoice.totalAmount.toLocaleString()}` : "-"}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center justify-center h-9">
                          <span className="text-sm font-medium">
                            {selectedInvoice ? `₱${outstanding.toLocaleString()}` : "-"}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`applications.${index}.amountApplied`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0" 
                                    max={outstanding}
                                    placeholder="0.00" 
                                    {...field}
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
                            onClick={() => removeApplication(index)}
                            disabled={fields.length <= 1}
                            className="h-9 w-9 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  <Separator />

                  {/* Totals Row */}
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium bg-muted/50 p-3 rounded-md">
                    <div className="col-span-10 flex items-center">
                      <Calculator className="h-4 w-4 mr-2" />
                      <span>Total Payment Amount:</span>
                    </div>
                    <div className="col-span-1 text-right">₱{totalPaymentAmount.toFixed(2)}</div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}