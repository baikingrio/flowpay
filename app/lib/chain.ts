import { monadTestnet } from 'viem/chains'

export const chain = monadTestnet

export const FAUCET_URL = 'https://faucet.monad.xyz'

export const FIRST_PAYMENT_TO = '0x000000000000000000000000000000000000dEaD' as const

/** Prefill amount for First Payment (0.001 MON). */
export const FIRST_PAYMENT_VALUE = 10n ** 15n
