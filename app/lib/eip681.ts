import { getAddress, isAddress } from 'viem'

export type ParsePaymentUriSuccess = {
  ok: true
  address?: `0x${string}`
  ensName?: string
  chainId?: number
  valueWei?: bigint
  tokenAddress?: `0x${string}`
  tokenAmount?: bigint
  warnings: string[]
}

export type ParsePaymentUriFailure = {
  ok: false
  error: 'invalid' | 'checksum' | 'wrong_chain' | 'unsupported_function'
}

export type ParsePaymentUriResult = ParsePaymentUriSuccess | ParsePaymentUriFailure

export function buildPaymentUri(opts: {
  address: `0x${string}`
  chainId?: number
  valueWei?: bigint
}): string {
  const chainId = opts.chainId ?? 10143
  const address = getAddress(opts.address)
  let uri = `ethereum:${address}@${chainId}`
  if (opts.valueWei !== undefined)
    uri += `?value=${formatScientificWei(opts.valueWei)}`
  return uri
}

export function buildErc20TransferUri(opts: {
  token: `0x${string}`
  to: `0x${string}`
  amount: bigint
  chainId?: number
}): string {
  if (opts.amount <= 0n)
    throw new Error('Amount must be greater than 0')
  const chainId = opts.chainId ?? 10143
  const token = getAddress(opts.token)
  const to = getAddress(opts.to)
  return `ethereum:${token}@${chainId}/transfer?address=${to}&uint256=${opts.amount}`
}

export function toAppPayPath(uri: string): string {
  return `/pay?uri=${encodeURIComponent(uri)}`
}

export function parsePaymentUri(
  input: string,
  expectedChainId: number = 10143,
): ParsePaymentUriResult {
  const raw = input.trim()
  if (!raw)
    return { ok: false, error: 'invalid' }

  if (!raw.toLowerCase().startsWith('ethereum:')) {
    return parseHexTarget(raw, undefined, ['missing_chain'], expectedChainId)
  }

  let rest = raw.slice('ethereum:'.length)
  if (rest.toLowerCase().startsWith('pay-'))
    rest = rest.slice(4)

  const qIndex = rest.indexOf('?')
  const pathPart = qIndex === -1 ? rest : rest.slice(0, qIndex)
  const query = qIndex === -1 ? '' : rest.slice(qIndex + 1)

  const slashIndex = pathPart.indexOf('/')
  let target = pathPart
  let functionPath: string | undefined

  if (slashIndex !== -1) {
    target = pathPart.slice(0, slashIndex)
    functionPath = pathPart.slice(slashIndex + 1)
    if (functionPath !== 'transfer')
      return { ok: false, error: 'unsupported_function' }
  }

  let chainId: number | undefined
  const at = target.lastIndexOf('@')
  if (at !== -1) {
    const afterAt = target.slice(at + 1)
    target = target.slice(0, at)
    const id = Number(afterAt)
    if (!Number.isInteger(id) || id <= 0)
      return { ok: false, error: 'invalid' }
    chainId = id
    if (chainId !== expectedChainId)
      return { ok: false, error: 'wrong_chain' }
  }

  const warnings: string[] = []
  if (chainId === undefined)
    warnings.push('missing_chain')

  const base = parseHexTarget(target, chainId, warnings, expectedChainId)
  if (!base.ok)
    return base

  if (query) {
    const params = new URLSearchParams(query)

    if (functionPath === 'transfer') {
      base.tokenAddress = base.address
      base.address = undefined
      const addressParam = params.get('address')
      const uint256Param = params.get('uint256')
      if (addressParam && /^0x[0-9a-fA-F]{40}$/.test(addressParam))
        base.address = getAddress(addressParam)
      if (uint256Param) {
        try {
          base.tokenAmount = BigInt(uint256Param)
        }
        catch {
          base.warnings.push('bad_value')
        }
      }
    }
    else {
      const value = params.get('value')
      if (value) {
        try {
          base.valueWei = parseWeiNumber(value)
        }
        catch {
          base.warnings.push('bad_value')
        }
      }
    }
  }

  return base
}

function parseHexTarget(
  target: string,
  chainId: number | undefined,
  warnings: string[],
  _expectedChainId: number,
): ParsePaymentUriResult {
  const t = target.trim()
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) {
    const body = t.slice(2)
    const claimsChecksum = body !== body.toLowerCase() && body !== body.toUpperCase()
    if (claimsChecksum && !isAddress(t, { strict: true }))
      return { ok: false, error: 'checksum' }
    return {
      ok: true,
      address: getAddress(t),
      chainId,
      warnings,
    }
  }
  if (t.includes('.') || /^[a-z0-9-]+$/i.test(t)) {
    return { ok: true, ensName: t, chainId, warnings }
  }
  return { ok: false, error: 'invalid' }
}

function formatScientificWei(value: bigint): string {
  if (value === 0n)
    return '0'
  let n = value
  let exp = 0
  while (n % 10n === 0n) {
    n /= 10n
    exp++
  }
  return exp > 0 ? `${n}e${exp}` : `${value}`
}

function parseWeiNumber(raw: string): bigint {
  const m = /^([0-9]+)(?:\.([0-9]+))?(?:e([+-]?[0-9]+))?$/i.exec(raw.trim())
  if (!m)
    throw new Error('bad')
  const whole = m[1]
  const frac = m[2] ?? ''
  const exp = m[3] ? Number(m[3]) : 0
  const digits = `${whole}${frac}`
  const scale = exp - frac.length
  if (scale >= 0)
    return BigInt(digits) * 10n ** BigInt(scale)
  const cut = -scale
  if (cut >= digits.length)
    return 0n
  return BigInt(digits.slice(0, digits.length - cut))
}
