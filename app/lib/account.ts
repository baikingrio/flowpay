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

/** Kept for tests/docs: Safari hybrid Sign In often exceeds this; unused for !stored. */
export const INSTANT_FAIL_MS = 400

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
 *
 * With a stored credentialId: user cancel on Continue must not Create
 * (would mint a new account).
 *
 * With no stored credentialId: Continue may open Safari's hybrid-only
 * Sign In sheet (iPhone / security key) when no local discoverable
 * Passkey exists. Canceling that sheet — even after hundreds of ms —
 * must still fall through to Create so macOS Touch ID can register a
 * platform Passkey. Instant-fail timing is no longer used to block Create.
 */
export async function continueThenCreate(
  storedCredentialId?: string,
): Promise<OpenedAccount> {
  const stored = storedCredentialId
    ? { credentialId: storedCredentialId }
    : undefined

  try {
    return await continueWithPasskey(stored)
  }
  catch (error) {
    if (isMeraError(error) && error.code === 'PRF_UNAVAILABLE') {
      throw error
    }

    const cancelled = isUserCancellation(error)

    // Only treat cancel as final when we already know which credential to use.
    if (cancelled && stored !== undefined) {
      throw new PasskeyCancelledError()
    }

    if (isMeraError(error) && error.code !== 'PASSKEY_OPERATION_FAILED') {
      throw error
    }

    return await createWithPasskey()
  }
}

/**
 * Passkey assertion for a single signing action. Never creates a new Passkey.
 * With a stored credentialId the platform goes straight to Touch ID / Face ID.
 */
export async function unlockForSigning(storedCredentialId?: string): Promise<OpenedAccount> {
  try {
    return await continueWithPasskey(
      storedCredentialId ? { credentialId: storedCredentialId } : undefined,
    )
  }
  catch (error) {
    if (isUserCancellation(error))
      throw new PasskeyCancelledError()
    throw error
  }
}

export { isMeraError, MeraError }
