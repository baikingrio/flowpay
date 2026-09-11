import { describe, expect, it } from 'vitest'
import { buildErc20TransferUri, buildPaymentUri, parsePaymentUri, toAppPayPath } from '../app/lib/eip681'
import { USDC_ADDRESS } from '../app/lib/tokens'

const ADDR = '0x000000000000000000000000000000000000dEaD' as const
// checksummed form of dEaD:
const DEAD = '0x000000000000000000000000000000000000dEaD'
const RECV = '0x000000000000000000000000000000000000dEaD' as const

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

  it('accepts transfer function path', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143/transfer?address=${DEAD}&uint256=1`, 10143)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.tokenAddress?.toLowerCase()).toBe(DEAD.toLowerCase())
      expect(r.address?.toLowerCase()).toBe(DEAD.toLowerCase())
      expect(r.tokenAmount).toBe(1n)
    }
  })

  it('rejects a mixed-case address with an invalid checksum', () => {
    const badChecksum = '0x000000000000000000000000000000000000DeaD'
    const r = parsePaymentUri(`ethereum:${badChecksum}@10143`, 10143)
    expect(r).toEqual({ ok: false, error: 'checksum' })
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

describe('ERC-20 transfer URI', () => {
  it('builds transfer uri', () => {
    const uri = buildErc20TransferUri({
      token: USDC_ADDRESS,
      to: RECV,
      amount: 12_500_000n,
      chainId: 10143,
    })
    expect(uri.startsWith(`ethereum:${USDC_ADDRESS}@10143/transfer?`)).toBe(true)
    expect(uri).toContain('uint256=12500000')
  })

  it('parses transfer uri', () => {
    const uri = buildErc20TransferUri({
      token: USDC_ADDRESS,
      to: RECV,
      amount: 12_500_000n,
      chainId: 10143,
    })
    const r = parsePaymentUri(uri, 10143)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.tokenAddress?.toLowerCase()).toBe(USDC_ADDRESS.toLowerCase())
      expect(r.address?.toLowerCase()).toBe(RECV.toLowerCase())
      expect(r.tokenAmount).toBe(12_500_000n)
      expect(r.valueWei).toBeUndefined()
    }
  })

  it('still rejects unknown functions', () => {
    const r = parsePaymentUri(`ethereum:${USDC_ADDRESS}@10143/approve?address=${RECV}&uint256=1`, 10143)
    expect(r).toEqual({ ok: false, error: 'unsupported_function' })
  })
})
