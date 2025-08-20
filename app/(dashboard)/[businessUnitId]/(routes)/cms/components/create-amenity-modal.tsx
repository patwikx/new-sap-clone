"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings } from "lucide-react"

const createAmenitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  icon: z.string().min(1, "Icon is required"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().optional(),
  sortOrder: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Sort order must be a positive number",
    }),
})

const iconOptions = [
  { value: "Wifi", label: "WiFi" },
  { value: "Car", label: "Parking" },
  { value: "Utensils", label: "Restaurant" },
  { value: "Waves", label: "Pool" },
  { value: "Dumbbell", label: "Gym" },
  { value: "Coffee", label: "Coffee" },
  { value: "Shield", label: "Security" },
  { value: "Clock", label: "24/7 Service" },
  { value: "MapPin", label: "Location" },
  { value: "Users", label: "Family Friendly" },
  { value: "Tv", label: "TV" },
  { value: "Wind", label: "Air Conditioning" },
  { value: "Bath", label: "Spa" },
  { value: "Bed", label: "Room Service" },
]

const categoryOptions = [
  { value: "room", label: "Room Amenities" },
  { value: "hotel", label: "Hotel Facilities" },
  { value: "dining", label: "Dining" },
  { value: "recreation", label: "Recreation" },
  { value: "business", label: "Business" },
  { value: "wellness", label: "Wellness" },
  { value: "other", label: "Other" },
]

interface CreateAmenityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  businessUnitId: string
}

export const CreateAmenityModal = ({ isOpen, onClose, onSuccess, businessUnitId }: CreateAmenityModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createAmenitySchema>>({
    resolver: zodResolver(createAmenitySchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      category: "",
      isActive: true,
      sortOrder: "1",
    },
  })

  const onSubmit = async (values: z.infer<typeof createAmenitySchema>) => {
    try {
      setLoading(true)

      const payload = {
        ...values,
        sortOrder: values.sortOrder ? Number.parseInt(values.sortOrder) : 1,
      }

      await axios.post(`/api/cms/amenities`, payload, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("Amenity created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create amenity: ${error}`)
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
            <Settings className="h-5 w-5" />
            Create Amenity
          </DialogTitle>
          <DialogDescription>Add a new amenity to showcase your hotel facilities.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amenity Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Swimming Pool" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe this amenity and its features..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.label}
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
                name="category"
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
                        {categoryOptions.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <div className="text-sm text-muted-foreground">Show on website</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Amenity"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
