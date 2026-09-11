import {
  createPasskeyWithPrfOutput,
  createSecp256k1SigningSession,
  getEvmAddress,
  getPasskeyPrfOutput,
  isMeraError,
  MeraError,
  type PasskeyCredentialMetadata,
  type Secp256k1SigningSession,
} from '@category-labs/mera'

import { relyingParty } from './relying-party'

export class PasskeyCancelledError extends Error {
  constructor() {
    super('Passkey ceremony was cancelled')
    this.name = 'PasskeyCancelledError'
  }
}

export type OpenedAccount = {
  session: Secp256k1SigningSession
  address: `0x${string}`
  credentialId: string
}

const INSTANT_FAIL_MS = 400

function isUserCancellation(error: unknown): boolean {
  let current: unknown = error
  for (let i = 0; i < 4; i++) {
    if (current instanceof DOMException && (current.name === 'NotAllowedError' || current.name === 'AbortError')) {
      return true
    }
    if (current instanceof Error && current.cause !== undefined) {
      current = current.cause
      continue
    }
    break
  }
  return false
}

function zeroKey(bytes: Uint8Array): void {
  bytes.fill(0)
}

function sessionFromPrf(prfOutput: Uint8Array): Secp256k1SigningSession {
  try {
    return createSecp256k1SigningSession({ privateKey: prfOutput })
  }
  finally {
    zeroKey(prfOutput)
  }
}

async function continueWithPasskey(
  credential?: PasskeyCredentialMetadata,
): Promise<OpenedAccount> {
  const rp = relyingParty()
  const result = await getPasskeyPrfOutput({
    rpId: rp.id,
    ...(credential !== undefined ? { credential } : {}),
  })
  const session = sessionFromPrf(result.prfOutput)
  return {
    session,
    address: getEvmAddress(session.publicKey),
    credentialId: result.credentialId,
  }
}

async function createWithPasskey(): Promise<OpenedAccount> {
  const rp = relyingParty()
  const result = await createPasskeyWithPrfOutput({
    rp,
    user: {
      name: 'flowpay',
      displayName: 'Flowpay',
    },
  })
  const session = sessionFromPrf(result.prfOutput)
  return {
    session,
    address: getEvmAddress(session.publicKey),
    credentialId: result.credentialId,
  }
}

/**
 * Continue first, Create only when no Passkey is available.
 * Instant NotAllowedError with no stored credential is treated as "none"
 * (typical when the platform has no discoverable credential). A slower
 * NotAllowedError is treated as user cancel — we do not Create.
 */
export async function continueThenCreate(
  storedCredentialId?: string,
): Promise<OpenedAccount> {
  const stored = storedCredentialId
    ? { credentialId: storedCredentialId }
    : undefined

  const started = Date.now()
  try {
    return await continueWithPasskey(stored)
  }
  catch (error) {
    if (isMeraError(error) && error.code === 'PRF_UNAVAILABLE') {
      throw error
    }

    const elapsed = Date.now() - started
    const cancelled = isUserCancellation(error)

    if (cancelled && (stored !== undefined || elapsed >= INSTANT_FAIL_MS)) {
      throw new PasskeyCancelledError()
    }

    if (isMeraError(error) && error.code !== 'PASSKEY_OPERATION_FAILED') {
      throw error
    }

    return await createWithPasskey()
  }
}

export { isMeraError, MeraError }
