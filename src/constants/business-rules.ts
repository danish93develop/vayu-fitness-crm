/**
 * Business rules — single source of truth from the project spec.
 * Centralized so a future setting/feature flag can override per gym.
 */
export const BUSINESS_RULES = {
  freeze: {
    /** Maximum total freeze days per membership */
    maxDaysPerMembership: 30,
    /** Maximum freeze sessions allowed (e.g. 15 + 15 = 2 phases) */
    maxPhases: 2,
  },
  installment: {
    /** Plans that allow split payment */
    allowedPlanTypes: ["MAIN_MEMBERSHIP"] as const,
    /** Only annual (or longer) plans allow installments */
    minDurationMonths: 12,
    /** Maximum installments for an annual plan */
    maxInstallments: 2,
  },
  membership: {
    /** Days before expiry to flag a membership as Expiring Soon */
    expiringSoonDays: 7,
  },
  attendance: {
    /** One attendance count per member per day in MVP */
    oneCountPerDay: true,
  },
  invoice: {
    /** Default GST percentage if gym setting absent */
    defaultGstPercent: 18,
  },
  security: {
    /** Lock account after this many failed login attempts */
    maxFailedLoginAttempts: 5,
    /** Lockout duration in minutes */
    lockoutMinutes: 15,
    /** Idle session timeout in minutes */
    idleSessionMinutes: 60,
    /** Total session lifetime in days */
    sessionLifetimeDays: 7,
  },
} as const;
