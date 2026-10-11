import { fallback, http } from 'viem'
import { monadTestnet } from 'viem/chains'

import { MONAD_TESTNET_RPCS } from '../../shared/faucet'

export const chain = monadTestnet

/** Monad testnet transport with RPC fallback (single RPCs have had TLS / empty-response outages). */
export function rpcTransport() {
  return fallback(MONAD_TESTNET_RPCS.map(url => http(url, { timeout: 10_000 })))
}

export const FAUCET_URL = 'https://faucet.monad.xyz'

export const FIRST_PAYMENT_TO = '0x000000000000000000000000000000000000dEaD' as const

/** Prefill amount for First Payment (0.001 MON). */
export const FIRST_PAYMENT_VALUE = 10n ** 15n

/** Returns true if recipient and amount match First Payment defaults. */
export function isFirstPaymentDefaults(recipient: string, amount: bigint | undefined): boolean {
  return recipient.toLowerCase() === FIRST_PAYMENT_TO.toLowerCase()
    && amount === FIRST_PAYMENT_VALUE
}
