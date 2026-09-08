import { describe, expect, it } from 'vitest'
import { buildPaymentUri, parsePaymentUri, toAppPayPath } from '../app/lib/eip681'

const ADDR = '0x000000000000000000000000000000000000dEaD' as const
// checksummed form of dEaD:
const DEAD = '0x000000000000000000000000000000000000dEaD'

describe('buildPaymentUri', () => {
  it('builds address@10143', () => {
    expect(buildPaymentUri({ address: DEAD, chainId: 10143 }))
      .toBe(`ethereum:${DEAD}@10143`)
  })

  it('appends scientific value', () => {
    const uri = buildPaymentUri({ address: DEAD, chainId: 10143, valueWei: 10n ** 15n })
    expect(uri).toBe(`ethereum:${DEAD}@10143?value=1e15`)
  })
})

describe('parsePaymentUri', () => {
  it('parses bare address', () => {
    const r = parsePaymentUri(DEAD, 10143)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.address?.toLowerCase()).toBe(DEAD.toLowerCase())
      expect(r.warnings).toContain('missing_chain')
    }
  })

  it('parses ethereum:addr@10143', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143`, 10143)
    expect(r.ok && r.address && r.chainId === 10143).toBeTruthy()
  })

  it('parses value scientific', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143?value=1e15`, 10143)
    expect(r.ok && r.valueWei === 10n ** 15n).toBeTruthy()
  })

  it('accepts pay- prefix', () => {
    const r = parsePaymentUri(`ethereum:pay-${DEAD}@10143`, 10143)
    expect(r.ok).toBe(true)
  })

  it('rejects wrong chain', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@1`, 10143)
    expect(r).toEqual({ ok: false, error: 'wrong_chain' })
  })

  it('rejects function path', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143/transfer?address=${DEAD}&uint256=1`, 10143)
    expect(r).toEqual({ ok: false, error: 'unsupported_function' })
  })

  it('keeps address when value is garbage', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143?value=nope`, 10143)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.valueWei).toBeUndefined()
      expect(r.warnings).toContain('bad_value')
    }
  })

  it('returns ensName for non-hex target', () => {
    const r = parsePaymentUri('ethereum:alice.eth@10143', 10143)
    expect(r.ok && r.ensName === 'alice.eth' && !r.address).toBeTruthy()
  })
})

describe('toAppPayPath', () => {
  it('builds query path', () => {
    const uri = `ethereum:${DEAD}@10143`
    expect(toAppPayPath(uri)).toBe(`/pay?uri=${encodeURIComponent(uri)}`)
  })
})
