import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import {
  COOLDOWN_MS,
  CooldownTracker,
  cooldownKeys,
  decideDrip,
  DEFAULT_DRIP_WEI,
  FAUCET_ERROR_CODES,
  FAUCET_HTTP_STATUS,
  formatDrip,
  GAS_BUFFER_WEI,
  hasFunds,
  isFaucetErrorCode,
  MAX_DRIP_WEI,
  normalizePrivateKey,
  parseDripAmount,
  RECIPIENT_MAX_BALANCE_WEI,
  validateRecipient,
} from '../shared/faucet'
import { claimMon, MON_CLAIM_ERROR_KEY, showsExternalFaucet } from '../app/lib/mon-faucet'

const FAUCET = '0x8726959f2332A562F850418F38c533A94FbB0D6B'
const USER = '0x52908400098527886E0F7030069857D2E4169EE7'

describe('defaults', () => {
  it('drips 0.05 MON, eligible below 0.02 MON', () => {
    expect(formatDrip(DEFAULT_DRIP_WEI)).toBe('0.05')
    expect(RECIPIENT_MAX_BALANCE_WEI).toBe(parseEther('0.02'))
    expect(COOLDOWN_MS).toBe(600_000)
  })
  it('maps every error code to an HTTP status and an i18n key', () => {
    for (const code of FAUCET_ERROR_CODES) {
      expect(FAUCET_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400)
      expect(MON_CLAIM_ERROR_KEY[code]).toMatch(/^monErr/)
    }
    expect(FAUCET_HTTP_STATUS.invalid_address).toBe(400)
    expect(FAUCET_HTTP_STATUS.cooldown).toBe(429)
    expect(FAUCET_HTTP_STATUS.faucet_empty).toBe(503)
  })
  it('recognises error codes', () => {
    expect(isFaucetErrorCode('cooldown')).toBe(true)
    expect(isFaucetErrorCode('boom')).toBe(false)
    expect(isFaucetErrorCode(undefined)).toBe(false)
  })
})

describe('parseDripAmount', () => {
  it('uses the default when unset or invalid', () => {
    expect(parseDripAmount(undefined)).toBe(DEFAULT_DRIP_WEI)
    expect(parseDripAmount('')).toBe(DEFAULT_DRIP_WEI)
    expect(parseDripAmount('abc')).toBe(DEFAULT_DRIP_WEI)
    expect(parseDripAmount('-1')).toBe(DEFAULT_DRIP_WEI)
    expect(parseDripAmount('0')).toBe(DEFAULT_DRIP_WEI)
    expect(parseDripAmount('1e18')).toBe(DEFAULT_DRIP_WEI)
  })
  it('accepts sane overrides and caps at 1 MON', () => {
    expect(parseDripAmount(' 0.1 ')).toBe(parseEther('0.1'))
    expect(parseDripAmount('1')).toBe(MAX_DRIP_WEI)
    expect(parseDripAmount('5')).toBe(DEFAULT_DRIP_WEI)
  })
})

describe('normalizePrivateKey', () => {
  const hex = 'ab'.repeat(32)
  it('accepts with or without 0x', () => {
    expect(normalizePrivateKey(hex)).toBe(`0x${hex}`)
    expect(normalizePrivateKey(` 0x${hex}\n`)).toBe(`0x${hex}`)
  })
  it('rejects missing / malformed keys', () => {
    expect(normalizePrivateKey(undefined)).toBeUndefined()
    expect(normalizePrivateKey('')).toBeUndefined()
    expect(normalizePrivateKey('0x1234')).toBeUndefined()
    expect(normalizePrivateKey(`0x${'zz'.repeat(32)}`)).toBeUndefined()
  })
})

describe('validateRecipient', () => {
  it('accepts lowercase and checksummed addresses, returns checksum form', () => {
    expect(validateRecipient(USER.toLowerCase(), FAUCET)).toEqual({ ok: true, address: USER })
    expect(validateRecipient(` ${USER} `, FAUCET)).toEqual({ ok: true, address: USER })
  })
  it('rejects junk, zero address and the faucet itself', () => {
    for (const bad of [undefined, null, 42, '', 'vitalik.eth', '0x123', `0x${'0'.repeat(40)}`, FAUCET, FAUCET.toLowerCase()])
      expect(validateRecipient(bad, FAUCET)).toEqual({ ok: false, error: 'invalid_address' })
  })
})

describe('decideDrip', () => {
  const amount = DEFAULT_DRIP_WEI
  const rich = parseEther('10')
  it('allows an empty recipient when the faucet has funds', () => {
    expect(decideDrip({ recipientBalance: 0n, faucetBalance: rich, amount })).toBeNull()
    expect(decideDrip({ recipientBalance: RECIPIENT_MAX_BALANCE_WEI - 1n, faucetBalance: rich, amount })).toBeNull()
  })
  it('refuses recipients that already hold ≥ 0.02 MON', () => {
    expect(decideDrip({ recipientBalance: RECIPIENT_MAX_BALANCE_WEI, faucetBalance: rich, amount })).toBe('has_balance')
  })
  it('refuses when the faucet cannot cover amount + gas buffer', () => {
    expect(hasFunds(amount + GAS_BUFFER_WEI, amount)).toBe(true)
    expect(hasFunds(amount + GAS_BUFFER_WEI - 1n, amount)).toBe(false)
    expect(decideDrip({ recipientBalance: 0n, faucetBalance: amount, amount })).toBe('faucet_empty')
    expect(decideDrip({ recipientBalance: 0n, faucetBalance: 0n, amount })).toBe('faucet_empty')
  })
})

describe('CooldownTracker', () => {
  it('blocks the same ip or address for the window, then frees it', () => {
    const tracker = new CooldownTracker(1000)
    const keys = cooldownKeys(USER, '1.2.3.4')
    expect(tracker.isFree(keys, 0)).toBe(true)
    tracker.mark(keys, 0)
    expect(tracker.isFree(keys, 999)).toBe(false)
    expect(tracker.isFree(cooldownKeys('0x0000000000000000000000000000000000000001', '1.2.3.4'), 500)).toBe(false)
    expect(tracker.isFree(cooldownKeys(USER.toLowerCase(), '5.6.7.8'), 500)).toBe(false)
    expect(tracker.isFree(keys, 1000)).toBe(true)
  })
  it('release undoes a reservation', () => {
    const tracker = new CooldownTracker(1000)
    const keys = cooldownKeys(USER, undefined)
    expect(keys).toEqual([`addr:${USER.toLowerCase()}`])
    tracker.mark(keys, 0)
    tracker.release(keys)
    expect(tracker.isFree(keys, 1)).toBe(true)
  })
  it('stays bounded', () => {
    const tracker = new CooldownTracker(1000, 10)
    for (let i = 0; i < 50; i++)
      tracker.mark([`k${i}`], 0)
    expect(tracker.size).toBeLessThanOrEqual(10)
  })
})

describe('claimMon (client)', () => {
  const respond = (status: number, body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status })) as typeof fetch

  it('returns the hash on success', async () => {
    const hash = `0x${'a'.repeat(64)}`
    expect(await claimMon(USER, respond(200, { hash, amount: '0.05', status: 'confirmed' })))
      .toEqual({ ok: true, hash, amount: '0.05', pending: false })
    expect(await claimMon(USER, respond(200, { hash, amount: '0.05', status: 'pending' })))
      .toMatchObject({ ok: true, pending: true })
  })
  it('passes known error codes through and maps the rest to send_failed', async () => {
    expect(await claimMon(USER, respond(409, { error: 'has_balance' }))).toEqual({ ok: false, error: 'has_balance' })
    expect(await claimMon(USER, respond(500, { message: 'x' }))).toEqual({ ok: false, error: 'send_failed' })
    const offline = (async () => { throw new Error('offline') }) as typeof fetch
    expect(await claimMon(USER, offline)).toEqual({ ok: false, error: 'send_failed' })
  })
  it('offers the external faucet only when ours cannot help', () => {
    expect(showsExternalFaucet('faucet_empty')).toBe(true)
    expect(showsExternalFaucet('faucet_unconfigured')).toBe(true)
    expect(showsExternalFaucet('cooldown')).toBe(false)
    expect(showsExternalFaucet(undefined)).toBe(false)
  })
})
