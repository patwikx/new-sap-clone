"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Settings, Save, DollarSign, FileText, Users, Percent } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"

// Import shared types and schema
import {
  posConfigSchema,
  PosConfigFormData,
  GlAccount,
  NumberingSeries,
  BusinessPartner,
  PosConfiguration,
} from "@/types/pos-config" // Assuming types are saved in './types/pos-config'

// --- POS Configuration Form Component ---

interface PosConfigurationFormProps {
  config: PosConfiguration | null;
  onSave: (config: Omit<PosConfigFormData, 'serviceChargeRate'> & { serviceChargeRate: number }) => Promise<void>;
  loading: boolean;
  businessUnitId: string;
}

export const PosConfigurationForm = ({ config, onSave, loading, businessUnitId }: PosConfigurationFormProps) => {
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [numberingSeries, setNumberingSeries] = useState<NumberingSeries[]>([])
  const [customers, setCustomers] = useState<BusinessPartner[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const form = useForm<PosConfigFormData>({
    resolver: zodResolver(posConfigSchema),
    defaultValues: {
      autoPostToGl: false,
      autoCreateArInvoice: false,
      salesRevenueAccountId: "",
      salesTaxAccountId: "",
      cashAccountId: "",
      discountAccountId: "",
      serviceChargeAccountId: "",
      defaultCustomerBpCode: "WALK-IN",
      requireCustomerSelection: false,
      enableDiscounts: true,
      enableServiceCharge: false,
      serviceChargeRate: "0",
      arInvoiceSeriesId: "",
      journalEntrySeriesId: "",
    },
  })

  // Load reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [accountsRes, seriesRes, customersRes] = await Promise.all([
          axios.get(`/api/${businessUnitId}/gl-accounts`, {
            headers: { 'x-business-unit-id': businessUnitId }
          }),
          axios.get(`/api/${businessUnitId}/numbering-series`, {
            headers: { 'x-business-unit-id': businessUnitId }
          }),
          axios.get(`/api/${businessUnitId}/business-partners?type=CUSTOMER`, {
            headers: { 'x-business-unit-id': businessUnitId }
          })
        ])
        
        setGlAccounts(accountsRes.data)
        setNumberingSeries(seriesRes.data)
        setCustomers(customersRes.data)
      } catch (error) {
        console.error("Failed to fetch reference data:", error)
        toast.error("Failed to load reference data")
      } finally {
        setDataLoading(false)
      }
    }

    fetchReferenceData()
  }, [businessUnitId])

  // Populate form when config loads
  useEffect(() => {
    if (config) {
      form.reset({
        autoPostToGl: config.autoPostToGl,
        autoCreateArInvoice: config.autoCreateArInvoice,
        salesRevenueAccountId: config.salesRevenueAccountId || "",
        salesTaxAccountId: config.salesTaxAccountId || "",
        cashAccountId: config.cashAccountId || "",
        discountAccountId: config.discountAccountId || "",
        serviceChargeAccountId: config.serviceChargeAccountId || "",
        defaultCustomerBpCode: config.defaultCustomerBpCode,
        requireCustomerSelection: config.requireCustomerSelection,
        enableDiscounts: config.enableDiscounts,
        enableServiceCharge: config.enableServiceCharge,
        serviceChargeRate: config.serviceChargeRate?.toString() || "0",
        arInvoiceSeriesId: config.arInvoiceSeriesId || "",
        journalEntrySeriesId: config.journalEntrySeriesId || "",
      })
    }
  }, [config, form])

  const onSubmit = async (values: PosConfigFormData) => {
    const payload = {
      ...values,
      serviceChargeRate: values.serviceChargeRate ? parseFloat(values.serviceChargeRate) : 0,
    }
    await onSave(payload)
  }

  // Filter accounts by type
  const revenueAccounts = glAccounts.filter(acc => acc.accountType.name === 'REVENUE')
  const assetAccounts = glAccounts.filter(acc => acc.accountType.name === 'ASSET')
  const liabilityAccounts = glAccounts.filter(acc => acc.accountType.name === 'LIABILITY')
  const expenseAccounts = glAccounts.filter(acc => acc.accountType.name === 'EXPENSE')

  // Filter numbering series
  const arInvoiceSeries = numberingSeries.filter(ns => ns.documentType === 'AR_INVOICE')
  const journalEntrySeries = numberingSeries.filter(ns => ns.documentType === 'JOURNAL_ENTRY')

  if (dataLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          POS Configuration
        </CardTitle>
        <CardDescription>
          Configure automatic posting and GL account mappings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Automation Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Automation Settings</h3>
              
              <FormField
                control={form.control}
                name="autoPostToGl"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-Post to General Ledger</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically create journal entries when orders are paid
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoCreateArInvoice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-Create AR Invoices</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically create AR invoices for paid orders
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Default GL Accounts */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Default GL Accounts
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="salesRevenueAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Revenue Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select revenue account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {revenueAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountCode} - {account.name}
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
                  name="salesTaxAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Tax Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {liabilityAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountCode} - {account.name}
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
                  name="cashAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Cash Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cash account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountCode} - {account.name}
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
                  name="discountAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
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

            <Separator />

            {/* Customer Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultCustomerBpCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select default customer" />
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

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requireCustomerSelection"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Require Customer Selection</FormLabel>
                          <div className="text-xs text-muted-foreground">
                            Force cashiers to select a customer for each order
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Discount & Service Charge Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Discounts & Service Charges
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="enableDiscounts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Enable Discounts</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Allow discounts on POS orders
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableServiceCharge"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Enable Service Charge</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Add automatic service charge to orders
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("enableServiceCharge") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceChargeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Charge Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="10.00"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceChargeAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Charge Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service charge account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {revenueAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
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
              )}
            </div>

            <Separator />

            {/* Numbering Series */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Numbering
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="arInvoiceSeriesId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AR Invoice Series</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select AR invoice series" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {arInvoiceSeries.map((series) => (
                            <SelectItem key={series.id} value={series.id}>
                              {series.name}
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
                  name="journalEntrySeriesId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Journal Entry Series</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select journal entry series" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {journalEntrySeries.map((series) => (
                            <SelectItem key={series.id} value={series.id}>
                              {series.name}
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

            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="gap-2">
                <Save className="h-4 w-4" />
                {loading ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
