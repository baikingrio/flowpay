import { describe, expect, it } from 'vitest'
import {
  fetchMonUsdPrice,
  formatUnitPrice,
  formatUsd,
  MON_PRICE_URL,
  parseCoinGeckoPrice,
  portfolioUsd,
  PRICE_FRESH_MS,
  PRICE_STALE_MS,
  readCachedPrice,
  usdValue,
  writeCachedPrice,
} from '../app/lib/price'

function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v) },
    removeItem: (k) => { store.delete(k) },
    key: () => null,
  }
}

function okFetch(body: unknown): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch
}

const failingFetch = (async () => {
  throw new Error('offline')
}) as typeof fetch

describe('parseCoinGeckoPrice', () => {
  it('reads the usd price for monad', () => {
    expect(parseCoinGeckoPrice({ monad: { usd: 0.0247 } })).toBe(0.0247)
  })
  it('rejects missing, zero, negative and non-numeric prices', () => {
    expect(parseCoinGeckoPrice({})).toBeUndefined()
    expect(parseCoinGeckoPrice(null)).toBeUndefined()
    expect(parseCoinGeckoPrice({ monad: {} })).toBeUndefined()
    expect(parseCoinGeckoPrice({ monad: { usd: 0 } })).toBeUndefined()
    expect(parseCoinGeckoPrice({ monad: { usd: -1 } })).toBeUndefined()
    expect(parseCoinGeckoPrice({ monad: { usd: '0.02' } })).toBeUndefined()
  })
})

describe('fetchMonUsdPrice', () => {
  it('fetches from CoinGecko and caches the result', async () => {
    const storage = memoryStorage()
    let calledWith = ''
    const fetchFn = (async (url: string) => {
      calledWith = url
      return new Response(JSON.stringify({ monad: { usd: 0.03 } }), { status: 200 })
    }) as unknown as typeof fetch
    expect(await fetchMonUsdPrice({ fetchFn, storage, now: 1000 })).toBe(0.03)
    expect(calledWith).toBe(MON_PRICE_URL)
    expect(readCachedPrice(storage)).toEqual({ usd: 0.03, at: 1000 })
  })

  it('uses a fresh cache without hitting the network', async () => {
    const storage = memoryStorage()
    writeCachedPrice({ usd: 0.05, at: 1000 }, storage)
    expect(await fetchMonUsdPrice({ fetchFn: failingFetch, storage, now: 1000 + PRICE_FRESH_MS - 1 })).toBe(0.05)
  })

  it('falls back to a stale cache when the network fails', async () => {
    const storage = memoryStorage()
    writeCachedPrice({ usd: 0.05, at: 0 }, storage)
    expect(await fetchMonUsdPrice({ fetchFn: failingFetch, storage, now: PRICE_STALE_MS - 1 })).toBe(0.05)
  })

  it('returns undefined when the network fails and the cache is too old', async () => {
    const storage = memoryStorage()
    writeCachedPrice({ usd: 0.05, at: 0 }, storage)
    expect(await fetchMonUsdPrice({ fetchFn: failingFetch, storage, now: PRICE_STALE_MS + 1 })).toBeUndefined()
  })

  it('returns undefined on HTTP errors or bad payloads, never throws', async () => {
    const storage = memoryStorage()
    const notOk = (async () => new Response('rate limited', { status: 429 })) as typeof fetch
    expect(await fetchMonUsdPrice({ fetchFn: notOk, storage, now: 1 })).toBeUndefined()
    expect(await fetchMonUsdPrice({ fetchFn: okFetch({ foo: 1 }), storage, now: 1 })).toBeUndefined()
  })
})

describe('portfolioUsd', () => {
  it('values mUSDC at $1 and MON at the given price', () => {
    const p = portfolioUsd({ monWei: 2n * 10n ** 18n, usdcBase: 12_500_000n, monPriceUsd: 0.5 })
    expect(p.usdcUsd).toBe(12.5)
    expect(p.monUsd).toBe(1)
    expect(p.total).toBe(13.5)
    expect(p.includesMon).toBe(true)
  })

  it('excludes MON from the total when there is no price', () => {
    const p = portfolioUsd({ monWei: 5n * 10n ** 18n, usdcBase: 1_000_000n, monPriceUsd: undefined })
    expect(p.monUsd).toBeUndefined()
    expect(p.total).toBe(1)
    expect(p.includesMon).toBe(false)
  })

  it('treats unknown balances as zero in the total', () => {
    expect(portfolioUsd({ monWei: undefined, usdcBase: undefined, monPriceUsd: 1 }).total).toBe(0)
    expect(usdValue(undefined, 6, 1)).toBeUndefined()
  })
})

describe('formatUsd / formatUnitPrice', () => {
  it('formats currency', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50')
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(0.004)).toBe('<$0.01')
    expect(formatUsd(undefined)).toBe('—')
  })
  it('keeps sub-cent unit prices readable', () => {
    expect(formatUnitPrice(0.0247483)).toBe('$0.0247')
    expect(formatUnitPrice(1)).toBe('$1.00')
    expect(formatUnitPrice(undefined)).toBe('—')
  })
})
