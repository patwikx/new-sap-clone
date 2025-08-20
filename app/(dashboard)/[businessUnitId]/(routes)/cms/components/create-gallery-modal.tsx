"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"
import { ImageIcon } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const createGallerySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().optional(),
  sortOrder: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Sort order must be a positive number",
    }),
})

const categoryOptions = [
  { value: "rooms", label: "Rooms" },
  { value: "amenities", label: "Amenities" },
  { value: "dining", label: "Dining" },
  { value: "exterior", label: "Exterior" },
  { value: "events", label: "Events" },
  { value: "spa", label: "Spa & Wellness" },
  { value: "recreation", label: "Recreation" },
  { value: "other", label: "Other" },
]

interface CreateGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  businessUnitId: string
}

export const CreateGalleryModal = ({ isOpen, onClose, onSuccess, businessUnitId }: CreateGalleryModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createGallerySchema>>({
    resolver: zodResolver(createGallerySchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      category: "",
      isActive: true,
      sortOrder: "1",
    },
  })

  const onSubmit = async (values: z.infer<typeof createGallerySchema>) => {
    try {
      setLoading(true)

      const payload = {
        ...values,
        sortOrder: values.sortOrder ? Number.parseInt(values.sortOrder) : 1,
      }

      await axios.post(`/api/cms/gallery`, payload, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("Gallery image created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create gallery image: ${error}`)
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
            <ImageIcon className="h-5 w-5" />
            Add Gallery Image
          </DialogTitle>
          <DialogDescription>Add a new image to your website gallery.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Luxury Suite" {...field} />
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
                    <Textarea placeholder="Describe this image..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://images.pexels.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
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
                {loading ? "Creating..." : "Add Image"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
