import { isFaucetErrorCode, type FaucetErrorCode } from '../../shared/faucet'

export type MonClaimResult =
  | { ok: true, hash: `0x${string}`, amount: string, pending: boolean }
  | { ok: false, error: FaucetErrorCode }

export interface MonFaucetStatus {
  configured: boolean
  address: `0x${string}` | null
  amount: string | null
  /** null = unknown (RPC hiccup); treat as available. */
  funded: boolean | null
}

/** Ask the server faucet to drip MON to `address`. No Passkey: we are only receiving. Never throws. */
export async function claimMon(address: `0x${string}`, fetcher: typeof fetch = fetch): Promise<MonClaimResult> {
  try {
    const res = await fetcher('/api/faucet/mon', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    const data = await res.json().catch(() => null) as Record<string, unknown> | null
    if (res.ok && data && typeof data.hash === 'string' && data.hash.startsWith('0x')) {
      return {
        ok: true,
        hash: data.hash as `0x${string}`,
        amount: typeof data.amount === 'string' ? data.amount : '0.05',
        pending: data.status === 'pending',
      }
    }
    return { ok: false, error: isFaucetErrorCode(data?.error) ? data.error : 'send_failed' }
  }
  catch {
    return { ok: false, error: 'send_failed' }
  }
}

export async function fetchMonFaucetStatus(fetcher: typeof fetch = fetch): Promise<MonFaucetStatus | undefined> {
  try {
    const res = await fetcher('/api/faucet/status')
    if (!res.ok)
      return undefined
    return await res.json() as MonFaucetStatus
  }
  catch {
    return undefined
  }
}

/** i18n key for each error code. */
export const MON_CLAIM_ERROR_KEY: Record<FaucetErrorCode, string> = {
  invalid_address: 'monErrInvalid',
  has_balance: 'monErrHasBalance',
  cooldown: 'monErrCooldown',
  faucet_empty: 'monErrEmpty',
  faucet_unconfigured: 'monErrUnconfigured',
  send_failed: 'monErrFailed',
}

/** Errors where we offer the external faucet as a fallback. */
export function showsExternalFaucet(error: FaucetErrorCode | undefined): boolean {
  return error === 'faucet_empty' || error === 'faucet_unconfigured'
}
