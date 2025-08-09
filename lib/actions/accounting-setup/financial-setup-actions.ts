"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { financialSetupSchema } from "@/lib/validations/financial-setup-schema";

// Define a return type for the server action
export type FormState = {
    success: boolean;
    message: string;
    error?: Record<string, string[] | undefined> | null;
};

/**
 * Server action to perform the initial financial setup for a business unit.
 * This action is transactional, meaning all database operations must succeed,
 * or none will be committed.
 *
 * @param data The validated form data from the setup wizard.
 * @param businessUnitId The ID of the business unit being configured.
 * @returns A promise that resolves to a FormState object.
 */
export async function createFinancialSetup(
    data: z.infer<typeof financialSetupSchema>,
    businessUnitId: string
): Promise<FormState> {
    const session = await auth();

    // 1. Authorization Check
    if (!session?.user?.id) {
        return { success: false, message: "User not authenticated." };
    }

    const hasPermission = session.user.assignments.some(
        (a) => a.businessUnitId === businessUnitId // && a.role.role === 'ADMIN' // <-- Add role check if needed
    );

    if (!hasPermission) {
        return { success: false, message: "User does not have permission for this business unit." };
    }

    // 2. Validation
    const validatedFields = financialSetupSchema.safeParse(data);
    if (!validatedFields.success) {
        return {
            success: false,
            message: "Invalid data provided.",
            error: validatedFields.error.flatten().fieldErrors,
        };
    }

    const {
        periods,
        chartOfAccounts,
        numberingSeries,
        bankAccounts
    } = validatedFields.data;

    try {
        // 3. Database Transaction
        await prisma.$transaction(async (tx) => {
            // Step A: Create Account Categories
            const createdCategories = await tx.accountCategory.createManyAndReturn({
                data: chartOfAccounts.categories.map(cat => ({
                    ...cat,
                    businessUnitId,
                })),
            });
            
            // Create a map for easy lookup
            const categoryMap = new Map(createdCategories.map(c => [c.name, c.id]));

            // Step B: Create Control G/L Accounts
            const createdGlAccounts = await tx.glAccount.createManyAndReturn({
                 data: chartOfAccounts.controlAccounts.map(acc => {
                    const categoryId = categoryMap.get(acc.accountCategoryId); // Here we assume accountCategoryId is the name for mapping
                    if (!categoryId) {
                        throw new Error(`Category "${acc.accountCategoryId}" not found for account "${acc.name}"`);
                    }
                    return {
                        ...acc,
                        accountCategoryId: categoryId,
                        businessUnitId,
                        isControlAccount: true, // All initial accounts are control accounts
                    };
                }),
            });
            
            const glAccountMap = new Map(createdGlAccounts.map(acc => [acc.name, acc.id]));

            // Step C: Create Accounting Periods
            await tx.accountingPeriod.createMany({
                data: periods.map(p => ({
                    ...p,
                    businessUnitId,
                })),
            });

            // Step D: Create Numbering Series
            await tx.numberingSeries.createMany({
                data: numberingSeries.map(ns => ({
                    ...ns,
                    businessUnitId,
                })),
            });

            // Step E: Create Bank Accounts
            if (bankAccounts.length > 0) {
                 await tx.bankAccount.createMany({
                    data: bankAccounts.map(bank => {
                        const glAccountId = glAccountMap.get(bank.glAccountId); // Here we assume glAccountId is the name for mapping
                        if (!glAccountId) {
                            throw new Error(`G/L Account "${bank.glAccountId}" not found for bank "${bank.name}"`);
                        }
                        return {
                            ...bank,
                            glAccountId: glAccountId,
                            businessUnitId,
                        };
                    }),
                });
            }
        });

        return { success: true, message: "Financial setup completed successfully." };

    } catch (error) {
        console.error("Financial Setup Failed:", error);
        let errorMessage = "An unexpected error occurred during setup.";
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             // Handle specific Prisma errors, e.g., unique constraint violations
            if (error.code === 'P2002') {
                errorMessage = "A record with this value already exists. Please check your inputs.";
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        return { success: false, message: errorMessage };
    }
}
