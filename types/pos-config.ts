import * as z from "zod";

// Zod schema for form validation
export const posConfigSchema = z.object({
  autoPostToGl: z.boolean(),
  autoCreateArInvoice: z.boolean(),
  salesRevenueAccountId: z.string().optional().nullable(),
  salesTaxAccountId: z.string().optional().nullable(),
  cashAccountId: z.string().optional().nullable(),
  discountAccountId: z.string().optional().nullable(),
  serviceChargeAccountId: z.string().optional().nullable(),
  defaultCustomerBpCode: z.string().min(1, "Default customer is required"),
  requireCustomerSelection: z.boolean(),
  enableDiscounts: z.boolean(),
  enableServiceCharge: z.boolean(),
  serviceChargeRate: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100), {
    message: "Service charge rate must be between 0 and 100"
  }),
  arInvoiceSeriesId: z.string().optional().nullable(),
  journalEntrySeriesId: z.string().optional().nullable(),
});

// Type inferred from the Zod schema for form data
export type PosConfigFormData = z.infer<typeof posConfigSchema>;

// Interface for GL Account data fetched from the API
export interface GlAccount {
  id: string;
  accountCode: string;
  name: string;
  accountType: {
    name: string;
  };
}

// Interface for Numbering Series data
export interface NumberingSeries {
  id: string;
  name: string;
  documentType: string;
}

// Interface for Business Partner (Customer) data
export interface BusinessPartner {
  id: string;
  bpCode: string;
  name: string;
}

// Interface for the main POS Configuration object
export interface PosConfiguration {
  id: string;
  autoPostToGl: boolean;
  autoCreateArInvoice: boolean;
  salesRevenueAccountId: string | null;
  salesTaxAccountId: string | null;
  cashAccountId: string | null;
  discountAccountId: string | null;
  serviceChargeAccountId: string | null;
  defaultCustomerBpCode: string;
  requireCustomerSelection: boolean;
  enableDiscounts: boolean;
  enableServiceCharge: boolean;
  serviceChargeRate: number | null;
  arInvoiceSeriesId: string | null;
  journalEntrySeriesId: string | null;
}

// Interface for the validation result object
export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}
