/**
 * Central SubVault configuration.
 *
 * Plasmo reads its manifest overrides from the `manifest` key of package.json;
 * this module holds the runtime constants that background, content and UI code share.
 * It is imported with a relative path (`../../plasmo.config`).
 */
export const SUBVAULT_CONFIG = {
  /** A subscription domain with no visit for this many days is an "Idle Ghost SaaS". */
  idleThresholdDays: 30,
  /** Re-run the idle scan this often (minutes). */
  idleScanIntervalMinutes: 360,
  /** Trials ending within this many days are surfaced as urgent. */
  trialUrgentDays: 3,
  /** Reminder is scheduled this many days before the trial ends (calendar alarm). */
  reminderLeadDays: 1,
  /** Default reminder presets offered by the checkout sheet. */
  trialPresets: [7, 14] as const,
  /** URL fragments that make SubVault suspect a signup/checkout page. */
  checkoutPathPatterns: [
    "/checkout",
    "/subscribe",
    "/signup",
    "/billing",
    "/trial"
  ] as const,
  /** Payment-processor hostnames (matched as the host or any subdomain of it). */
  checkoutHosts: ["stripe.com", "chargebee.com", "paddle.com"] as const
} as const;

export type SubVaultConfig = typeof SUBVAULT_CONFIG;
