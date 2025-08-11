"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

const overrideSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

interface SupervisorOverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessUnitId: string;
}

export const SupervisorOverrideDialog = ({ isOpen, onClose, onSuccess, businessUnitId }: SupervisorOverrideDialogProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof overrideSchema>>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof overrideSchema>) => {
    setLoading(true);
    try {
      // The URL is now static. We add a `headers` object to the axios config.
      await axios.post(
        `/api/${businessUnitId}/verify-supervisor`,
        values, // The request body
        {
          headers: {
            'x-business-unit-id': businessUnitId,
          },
        }
      );
      
      toast.success("Override successful. Discount enabled.");
      onSuccess();
      form.reset();
    } catch (error) {
      // Improved error handling to show specific messages from the API
    
      toast.error(`Verification failed. Please try again. ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    if (!loading) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Supervisor Override
          </DialogTitle>
          <DialogDescription>
            Please enter supervisor or manager credentials to enable discounts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="supervisor.username" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Authorize"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};