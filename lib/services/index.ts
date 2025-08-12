// Export all services from a central location
export { AccountingService } from "./accounting-service"
export { PosService } from "./pos-service"
export { GlService } from "./gl-service"

// Re-export types
export type { AccountingSummary } from "./accounting-service"
export type { ValidationResult, AccountingStatus } from "./pos-service"
export type { AccountBalance, TrialBalanceData } from "./gl-service"