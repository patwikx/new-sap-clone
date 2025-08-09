"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { FileText } from "lucide-react"

const createGlAccountSchema = z.object({
  accountCode: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  accountTypeId: z.string().min(1, "Account type is required"),
  normalBalance: z.string().min(1, "Normal balance is required"),
  accountCategoryId: z.string().optional(),
  accountGroupId: z.string().optional(),
  description: z.string().optional(),
  isControlAccount: z.boolean().default(false).optional(),
})

interface AccountType {
  id: string
  name: string
  defaultNormalBalance: string
}

interface AccountCategory {
  id: string
  name: string
  code: string
}

interface AccountGroup {
  id: string
  name: string
  codePrefix: string
}

interface CreateGlAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateGlAccountModal = ({
  isOpen,
  onClose,
  onSuccess
}: CreateGlAccountModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [accountCategories, setAccountCategories] = useState<AccountCategory[]>([])
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([])

  const form = useForm<z.infer<typeof createGlAccountSchema>>({
    resolver: zodResolver(createGlAccountSchema),
    defaultValues: {
      accountCode: "",
      name: "",
      accountTypeId: "",
      normalBalance: "",
      accountCategoryId: "",
      accountGroupId: "",
      description: "",
      isControlAccount: false,
    },
  })

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [typesRes, categoriesRes, groupsRes] = await Promise.all([
        axios.get(`/api/${businessUnitId}/account-types`, { headers: { 'x-business-unit-id': businessUnitId } }),
        axios.get(`/api/${businessUnitId}/account-categories`, { headers: { 'x-business-unit-id': businessUnitId } }),
        axios.get(`/api/${businessUnitId}/account-groups`, { headers: { 'x-business-unit-id': businessUnitId } })
      ])
      setAccountTypes(typesRes.data)
      setAccountCategories(categoriesRes.data)
      setAccountGroups(groupsRes.data)
    } catch (error) {
      console.error("Failed to fetch reference data:", error)
      toast.error("Failed to load required data for the form.")
    }
  }, [businessUnitId])

  useEffect(() => {
    if (isOpen && businessUnitId) {
      fetchReferenceData()
    }
  }, [isOpen, businessUnitId, fetchReferenceData])

  // Auto-set normal balance when account type changes
  const watchAccountType = form.watch("accountTypeId")
  useEffect(() => {
    const selectedType = accountTypes.find(t => t.id === watchAccountType)
    if (selectedType) {
      form.setValue("normalBalance", selectedType.defaultNormalBalance)
    }
  }, [watchAccountType, accountTypes, form])

  const onSubmit = async (values: z.infer<typeof createGlAccountSchema>) => {
    try {
      setLoading(true)
      
      await axios.post(`/api/${businessUnitId}/gl-accounts`, values, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("GL account created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create GL account: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create GL Account
          </DialogTitle>
          <DialogDescription>
            Add a new general ledger account to your chart of accounts.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountTypes.map((type) => (
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
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cash on Hand" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="normalBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Normal Balance</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select normal balance" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DEBIT">Debit</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.code} - {category.name}
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
              name="accountGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Group</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account group (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isControlAccount"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Control Account</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark this as a control account for subsidiary ledgers
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
