/**
 * Feature flags for controlling which features are visible in the UI.
 *
 * This allows features to be developed and kept in the codebase
 * while being hidden from the primary user journey.
 */

export interface FeatureFlags {
  /**
   * Swap feature (MON ↔ USDC exchange)
   *
   * Product decision (2026-09-23): Swap is PAUSED from the product mainline.
   * Code is kept for future consideration, but removed from primary navigation
   * and default user flows. Product focus is merchant↔customer USDC payment.
   */
  swap: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  // Swap hidden by default; set to true to re-enable in navigation
  swap: false,
}

export function useFeatureFlags(): FeatureFlags {
  // In future, this could read from localStorage, env vars, or remote config
  return DEFAULT_FLAGS
}
