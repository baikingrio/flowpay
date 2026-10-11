/**
 * USD pricing for the wallet home.
 *
 * - mUSDC / USDC: pegged at $1.00.
 * - MON: Monad testnet MON has no market. As a reference we use CoinGecko's
 *   free, key-less simple-price endpoint for mainnet MON (id `monad`), cached
 *   in localStorage. Any failure → `undefined`; the UI then shows "—" and
 *   excludes MON from the total. A price is never invented.
 */
import { formatUnits } from 'viem'

export const MON_COINGECKO_ID = 'monad'
export const MON_PRICE_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${MON_COINGECKO_ID}&vs_currencies=usd`
export const USDC_USD_PRICE = 1

/** Fresh cache: no network call. */
export const PRICE_FRESH_MS = 5 * 60_000
/** Stale cache still used when the network fails. */
export const PRICE_STALE_MS = 24 * 60 * 60_000
const CACHE_KEY = 'flowpay.price.mon-usd'

export interface CachedPrice {
  usd: number
  at: number
}

function defaultStorage(): Storage | undefined {
  if (typeof window === 'undefined')
    return undefined
  try {
    return window.localStorage
  }
  catch {
    return undefined
  }
}

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** `{"monad":{"usd":0.0247}}` → 0.0247; anything else → undefined. */
export function parseCoinGeckoPrice(json: unknown, id: string = MON_COINGECKO_ID): number | undefined {
  if (typeof json !== 'object' || json === null)
    return undefined
  const entry = (json as Record<string, unknown>)[id]
  if (typeof entry !== 'object' || entry === null)
    return undefined
  const usd = (entry as Record<string, unknown>).usd
  return isValidPrice(usd) ? usd : undefined
}

export function readCachedPrice(storage?: Storage): CachedPrice | undefined {
  const s = storage ?? defaultStorage()
  if (!s)
    return undefined
  try {
    const raw = s.getItem(CACHE_KEY)
    if (!raw)
      return undefined
    const parsed = JSON.parse(raw) as Partial<CachedPrice>
    if (!isValidPrice(parsed.usd) || typeof parsed.at !== 'number')
      return undefined
    return { usd: parsed.usd, at: parsed.at }
  }
  catch {
    return undefined
  }
}

export function writeCachedPrice(price: CachedPrice, storage?: Storage): void {
  const s = storage ?? defaultStorage()
  try {
    s?.setItem(CACHE_KEY, JSON.stringify(price))
  }
  catch {
    // Quota / private mode: pricing still works for this page view.
  }
}

export interface FetchMonPriceOptions {
  fetchFn?: typeof fetch
  storage?: Storage
  now?: number
  timeoutMs?: number
}

/** MON reference price in USD, or undefined when unavailable. Never throws. */
export async function fetchMonUsdPrice(options: FetchMonPriceOptions = {}): Promise<number | undefined> {
  const now = options.now ?? Date.now()
  const cached = readCachedPrice(options.storage)
  if (cached && now - cached.at < PRICE_FRESH_MS)
    return cached.usd

  const fetchFn = options.fetchFn ?? (typeof fetch === 'function' ? fetch : undefined)
  if (fetchFn) {
    const controller = typeof AbortController === 'function' ? new AbortController() : undefined
    const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs ?? 6000) : undefined
    try {
      const response = await fetchFn(MON_PRICE_URL, { signal: controller?.signal, headers: { accept: 'application/json' } })
      if (response.ok) {
        const usd = parseCoinGeckoPrice(await response.json())
        if (usd !== undefined) {
          writeCachedPrice({ usd, at: now }, options.storage)
          return usd
        }
      }
    }
    catch {
      // fall through to stale cache
    }
    finally {
      if (timer !== undefined)
        clearTimeout(timer)
    }
  }

  if (cached && now - cached.at < PRICE_STALE_MS)
    return cached.usd
  return undefined
}

/** Token amount (base units) × price → USD number; undefined when price unknown. */
export function usdValue(amountBase: bigint | undefined, decimals: number, priceUsd: number | undefined): number | undefined {
  if (amountBase === undefined || priceUsd === undefined)
    return undefined
  return Number(formatUnits(amountBase, decimals)) * priceUsd
}

export interface PortfolioUsd {
  /** Sum of every asset whose price is known. */
  total: number
  monUsd: number | undefined
  usdcUsd: number | undefined
  /** False when MON is held but has no price (total excludes it). */
  includesMon: boolean
}

export function portfolioUsd(opts: {
  monWei: bigint | undefined
  usdcBase: bigint | undefined
  monPriceUsd: number | undefined
  usdcDecimals?: number
}): PortfolioUsd {
  const monUsd = usdValue(opts.monWei, 18, opts.monPriceUsd)
  const usdcUsd = usdValue(opts.usdcBase, opts.usdcDecimals ?? 6, USDC_USD_PRICE)
  return {
    total: (monUsd ?? 0) + (usdcUsd ?? 0),
    monUsd,
    usdcUsd,
    includesMon: opts.monPriceUsd !== undefined,
  }
}

/** $1,234.56 · "<$0.01" for dust · "—" for unknown. */
export function formatUsd(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value))
    return '—'
  if (value > 0 && value < 0.01)
    return '<$0.01'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

/** Unit price with enough precision for sub-cent tokens: $0.0247, $1.00. */
export function formatUnitPrice(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value))
    return '—'
  if (value >= 1)
    return formatUsd(value)
  return `$${Number(value.toPrecision(3))}`
}
