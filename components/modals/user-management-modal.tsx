"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react"; // 1. Import useEffect
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useUserManagementModal } from "@/hooks/use-user-management-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "../ui/button";

const formSchema = z.object({
    username: z.string().min(1, { message: "Username/Email is required."}),
    roleId: z.string().min(1, { message: "Please select a role." }),
});

type UserManagementFormValues = z.infer<typeof formSchema>;

export const UserManagementModal = () => {
    const { isOpen, onClose, initialData, roles } = useUserManagementModal();
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(false);

    const isEditMode = !!initialData;
    const title = isEditMode ? "Update User Role" : "Assign User";
    const description = isEditMode ? "Change the role for this user." : "Assign an existing user to this business unit by their username/email.";
    const action = isEditMode ? "Save changes" : "Assign";

    const form = useForm<UserManagementFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: '',
            roleId: ''
        }
    });

    // 2. CORE FIX: Use `useEffect` to react to changes in `initialData`
    useEffect(() => {
        if (initialData) {
            form.reset({
                username: initialData.username || '',
                roleId: initialData.roleId,
            });
        } else {
            form.reset({ username: '', roleId: ''});
        }
    }, [initialData, form]);

    const onSubmit = async (data: UserManagementFormValues) => {
        try {
            setLoading(true);
            if (isEditMode && initialData) { // 3. BUG FIX: Ensure initialData exists before using it
                await axios.patch(`/api/${params.businessUnitId}/user-management/${initialData.userId}`, data);
            } else {
                await axios.post(`/api/${params.businessUnitId}/user-management`, data);
            }
            router.refresh();
            toast.success(isEditMode ? "User role updated." : "User assigned successfully.");
            onClose();
        } catch (error) {
            toast.error(`Something went wrong. ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="username" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username (Email)</FormLabel>
                                <FormControl>
                                    <Input disabled={loading || isEditMode} placeholder="user@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="roleId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>{role.role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                            <Button disabled={loading} variant="outline" onClick={onClose} type="button">Cancel</Button>
                            <Button disabled={loading} type="submit">{action}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};