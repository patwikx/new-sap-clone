"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Banknote, Calculator, Plus, X, Home, ChevronRight, ChevronsUpDown, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const paymentApplicationSchema = z.object({
  arInvoiceId: z.string().min(1, "Invoice is required"),
  amountApplied: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
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

// Reusable Combobox Component
const Combobox = ({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
}) => {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 font-normal bg-transparent"
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function NewIncomingPaymentPage() {
  const params = useParams()
  const router = useRouter()
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
      paymentDate: new Date().toISOString().split("T")[0],
      bankAccountId: "",
      paymentMethodId: "",
      referenceNumber: "",
      remarks: "",
      applications: [{ arInvoiceId: "", amountApplied: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "applications",
  })

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [customersRes, bankAccountsRes, paymentMethodsRes] = await Promise.all([
          axios.get(`/api/${businessUnitId}/business-partners?type=CUSTOMER`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get(`/api/${businessUnitId}/bank-accounts`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get(`/api/${businessUnitId}/payment-methods`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
        ])
        setCustomers(customersRes.data.filter((bp: BusinessPartner) => bp.type === "CUSTOMER"))
        setBankAccounts(bankAccountsRes.data)
        setPaymentMethods(paymentMethodsRes.data)
      } catch (error) {
        console.error("Failed to fetch reference data:", error)
        toast.error("Failed to load reference data")
      }
    }

    if (businessUnitId) {
      fetchReferenceData()
    }
  }, [businessUnitId])

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
          headers: { "x-business-unit-id": businessUnitId },
        })
        setAvailableInvoices(response.data)
      } catch (error) {
        console.error("Failed to fetch customer invoices:", error)
        toast.error("Failed to load customer invoices")
      }
    }

    if (watchCustomer) {
      fetchCustomerInvoices()
    }
  }, [watchCustomer, businessUnitId])

  // Calculate total payment amount
  const applications = form.watch("applications")
  const totalPaymentAmount = applications.reduce((sum, app) => {
    return sum + (Number.parseFloat(app.amountApplied) || 0)
  }, 0)

  const onSubmit = async (values: z.infer<typeof createIncomingPaymentSchema>) => {
    try {
      setLoading(true)
      await axios.post(`/api/${businessUnitId}/incoming-payments`, values, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      toast.success("Incoming payment created successfully")
      router.push(`/${businessUnitId}/sales/payments`)
    } catch (error) {
      toast.error(`Failed to create incoming payment: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${businessUnitId}/sales/payments`)
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
    <div className="min-h-screen w-full px-6 py-6">
      {/* Page Header with Breadcrumbs */}
      <div className="space-y-4 mb-6">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}`} className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/sales`}>Sales</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/sales/payments`}>Incoming Payments</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Payment</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Title */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Banknote className="h-6 w-6" />
              Create Incoming Payment
            </h1>
            <p className="text-muted-foreground">Record a payment received from a customer.</p>
          </div>
        </div>
      </div>

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
                      <FormControl>
                        <Combobox
                          options={customers.map((customer) => ({
                            value: customer.bpCode,
                            label: `${customer.bpCode} - ${customer.name}`,
                          }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select customer..."
                        />
                      </FormControl>
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
                      <FormControl>
                        <Combobox
                          options={bankAccounts.map((account) => ({
                            value: account.id,
                            label: `${account.name} - ${account.bankName}`,
                          }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select bank account..."
                        />
                      </FormControl>
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
                      <FormControl>
                        <Combobox
                          options={paymentMethods.map((method) => ({
                            value: method.id,
                            label: method.name,
                          }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select payment method..."
                        />
                      </FormControl>
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
                  const selectedInvoice = availableInvoices.find(
                    (inv) => inv.id === form.watch(`applications.${index}.arInvoiceId`),
                  )
                  const outstanding = selectedInvoice ? selectedInvoice.totalAmount - selectedInvoice.amountPaid : 0

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`applications.${index}.arInvoiceId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Combobox
                                  options={availableInvoices.map((invoice) => ({
                                    value: invoice.id,
                                    label: `${invoice.docNum} - ₱${(invoice.totalAmount - invoice.amountPaid).toLocaleString()}`,
                                  }))}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select invoice..."
                                />
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
                <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                  <div className="flex justify-between text-base font-medium">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      <span>Total Payment Amount:</span>
                    </div>
                    <span>₱{totalPaymentAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Payment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
