/** Official Circle USDC on Monad testnet (optional later). */
export const CIRCLE_USDC_ADDRESS = '0x534b2f3A21130d7a60830c2Df862319e593943A3' as const

/**
 * Payment token for checkout.
 * Set to the deployed MockUSDC address after `forge create` / `script/deploy-mock-usdc.sh`.
 * Leave USE_MOCK_USDC true for demos; set false and point at CIRCLE_USDC_ADDRESS for real USDC.
 */
export const USE_MOCK_USDC = true

/** Deployed MockUSDC on Monad testnet — replace after deploy. */
export const MOCK_USDC_ADDRESS = '0x1093e1c191d33DAa66CEf233a92662DF441286c7' as const

export const USDC_ADDRESS = (USE_MOCK_USDC ? MOCK_USDC_ADDRESS : CIRCLE_USDC_ADDRESS)

export const USDC_DECIMALS = 6

export const IS_MOCK_USDC = USE_MOCK_USDC
