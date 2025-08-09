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
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"

const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  isActive: z.boolean(),
})

interface User {
  id: string
  name: string
  username: string
  isActive: boolean
  assignments: {
    businessUnitId: string
    businessUnit: { id: string; name: string }
    role: { id: string; role: string }
  }[]
}

interface Role {
  id: string
  role: string
}

interface BusinessUnit {
  id: string
  name: string
}

interface Assignment {
  businessUnitId: string
  roleId: string
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: User | null
  roles: Role[]
  businessUnits: BusinessUnit[]
}

export const EditUserModal = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  roles,
  businessUnits
}: EditUserModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])

  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: "",
      username: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        name: user.name,
        username: user.username,
        isActive: user.isActive,
      })
      
      setAssignments(
        user.assignments.map(a => ({
          businessUnitId: a.businessUnitId,
          roleId: a.role.id
        }))
      )
    }
  }, [user, isOpen, form])

  const addAssignment = () => {
    setAssignments([...assignments, { businessUnitId: "", roleId: "" }])
  }

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
      setAssignments(assignments.filter((_, i) => i !== index))
    }
  }

  const updateAssignment = (index: number, field: keyof Assignment, value: string) => {
    const updated = [...assignments]
    updated[index] = { ...updated[index], [field]: value }
    setAssignments(updated)
  }

  const onSubmit = async (values: z.infer<typeof editUserSchema>) => {
    if (!user) return

    try {
      setLoading(true)
      
      // Validate assignments
      const validAssignments = assignments.filter(a => a.businessUnitId && a.roleId)
      if (validAssignments.length === 0) {
        toast.error("At least one business unit assignment is required")
        setLoading(false) // Stop loading on validation error
        return
      }

      await axios.patch(`/api/${businessUnitId}/users/${user.id}`, {
        ...values,
        assignments: validAssignments
      }, {
        headers: {
          'x-business-unit-id': businessUnitId,
          'x-user-id': user.id // Add this line
        }
      })

      toast.success("User updated successfully")
      onSuccess()
    } catch (error) {
        toast.error(`Failed to create user ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information, roles, and business unit access.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        User can log in and access the system
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

            {/* Business Unit Assignments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Business Unit Access</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAssignment}
                >
                  Add Assignment
                </Button>
              </div>

              <div className="space-y-3">
                {assignments.map((assignment, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Select
                        value={assignment.businessUnitId}
                        onValueChange={(value) => updateAssignment(index, 'businessUnitId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Business Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {businessUnits.map((bu) => (
                            <SelectItem key={bu.id} value={bu.id}>
                              {bu.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={assignment.roleId}
                        onValueChange={(value) => updateAssignment(index, 'roleId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {assignments.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAssignment(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {assignments.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p>User will have access to {assignments.filter(a => a.businessUnitId && a.roleId).length} business unit(s)</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
