"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
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
import { Banknote } from "lucide-react"

const editBankAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  glAccountId: z.string().min(1, "GL Account is required"),
  currency: z.string().min(1, "Currency is required"),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),
  branch: z.string().optional(),
})

const currencies = [
  { value: "PHP", label: "Philippine Peso (PHP)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "GBP", label: "British Pound (GBP)" },
]

interface GlAccount {
  id: string
  accountCode: string
  name: string
}

interface BankAccount {
  id: string
  name: string
  bankName: string
  accountNumber: string
  glAccountId: string
  currency?: string
  iban?: string
  swiftCode?: string
  branch?: string
}

interface EditBankAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  account: BankAccount | null
}

export const EditBankAccountModal = ({
  isOpen,
  onClose,
  onSuccess,
  account
}: EditBankAccountModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])

  const form = useForm<z.infer<typeof editBankAccountSchema>>({
    resolver: zodResolver(editBankAccountSchema),
    defaultValues: {
      name: "",
      bankName: "",
      accountNumber: "",
      glAccountId: "",
      currency: "PHP",
      iban: "",
      swiftCode: "",
      branch: "",
    },
  })

  // Fetch GL Accounts
  useEffect(() => {
    const fetchGlAccounts = async () => {
      try {
        const response = await axios.get(`/api/${businessUnitId}/gl-accounts`, {
          headers: {
            'x-business-unit-id': businessUnitId,
          },
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
    if (account && isOpen) {
      form.reset({
        name: account.name,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        glAccountId: account.glAccountId,
        currency: account.currency || "PHP",
        iban: account.iban || "",
        swiftCode: account.swiftCode || "",
        branch: account.branch || "",
      })
    }
  }, [account, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editBankAccountSchema>) => {
    if (!account) return

    try {
      setLoading(true)
      
      await axios.patch(`/api/${businessUnitId}/bank-accounts/${account.id}`, values)

      toast.success("Bank account updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update bank account: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!account) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Edit Bank Account
          </DialogTitle>
          <DialogDescription>
            Update the bank account information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Operating Account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BDO Unibank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 007490123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
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
              name="glAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GL Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GL account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {glAccounts.map((account) => (
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Makati Branch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="swiftCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SWIFT Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BNORPHMM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input placeholder="International Bank Account Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Account"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}