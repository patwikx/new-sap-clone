import { z } from 'zod';
import { DocumentType, PeriodType } from '@prisma/client';

// Step 1: Business Unit & Fiscal Year
export const fiscalYearSchema = z.object({
  fiscalYear: z.number().min(2000).max(2100),
  startDate: z.date(),
  periodType: z.nativeEnum(PeriodType),
});

// Step 2: Accounting Periods
export const accountingPeriodSchema = z.object({
  name: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  fiscalYear: z.number(),
  periodNumber: z.number(),
  type: z.nativeEnum(PeriodType),
});

// Step 4: Chart of Accounts - Categories & Control Accounts
export const accountCategorySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
});

export const controlAccountSchema = z.object({
  accountCode: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  accountTypeId: z.string().min(1, "Account Type is required"),
  accountCategoryId: z.string().min(1, "Category is required"),
});

export const chartOfAccountsSchema = z.object({
  categories: z.array(accountCategorySchema),
  controlAccounts: z.array(controlAccountSchema),
});


// Step 5: Numbering Series
export const numberingSeriesSchema = z.object({
  name: z.string().min(1, "Name is required"),
  prefix: z.string().min(1, "Prefix is required"),
  // This line is the definitive fix for the code logic.
  nextNumber: z.number().int().positive().default(1),
  documentType: z.nativeEnum(DocumentType),
});

// Step 6: Bank Accounts
export const bankAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  glAccountId: z.string().min(1, "You must select a G/L Account"),
});


// The full multi-step form schema
export const financialSetupSchema = z.object({
  fiscalYear: fiscalYearSchema,
  periods: z.array(accountingPeriodSchema),
  chartOfAccounts: chartOfAccountsSchema,
  numberingSeries: z.array(numberingSeriesSchema),
  bankAccounts: z.array(bankAccountSchema),
});

// We'll also define the types for use in our components
export type FiscalYearValues = z.infer<typeof fiscalYearSchema>;
export type AccountingPeriodValues = z.infer<typeof accountingPeriodSchema>;
export type ChartOfAccountsValues = z.infer<typeof chartOfAccountsSchema>;
export type NumberingSeriesValues = z.infer<typeof numberingSeriesSchema>;
export type BankAccountValues = z.infer<typeof bankAccountSchema>;
export type FinancialSetupValues = z.infer<typeof financialSetupSchema>;