import type { Secp256k1SigningSession } from '@category-labs/mera'
import { createPublicClient, http } from 'viem'
import { toAccount } from 'viem/accounts'
import { createSmartAccountClient } from 'permissionless'
import { toKernelSmartAccount } from 'permissionless/accounts'
import { createPimlicoClient } from 'permissionless/clients/pimlico'
import { entryPoint07Address } from 'viem/account-abstraction'
import { toViemAccount } from '@category-labs/mera/viem'

import { chain } from './chain'

const PIMLICO_API_KEY = import.meta.env.NUXT_PUBLIC_PIMLICO_API_KEY

/**
 * Checks if gas sponsorship is available (API key configured).
 */
export function isSponsorshipAvailable(): boolean {
  return typeof PIMLICO_API_KEY === 'string' && PIMLICO_API_KEY.length > 0
}

/**
 * Estimates the gas cost for a native token transfer in wei.
 * Uses a conservative estimate to avoid edge cases.
 */
export function estimateTransferGasCost(): bigint {
  // Native transfer: ~21,000 gas
  // Assume max 10 gwei (testnet is typically much lower)
  // Conservative: 25,000 gas * 10 gwei = 0.00025 MON
  return 25000n * 10n * 10n ** 9n
}

/**
 * Returns true if the user needs sponsorship: balance cannot cover gas + value.
 */
export function needsSponsorship(balance: bigint, value: bigint): boolean {
  const gasCost = estimateTransferGasCost()
  return balance < (value + gasCost)
}

/**
 * Sends a sponsored payment via ERC-4337 smart account + Pimlico paymaster.
 * 
 * Creates a deterministic Kernel smart account owned by the session's EOA,
 * then submits the transaction via Pimlico bundler with gas sponsorship.
 * 
 * @param session - Mera signing session (EOA signer)
 * @param to - Recipient address
 * @param value - Amount in wei
 * @returns Transaction hash
 * @throws Error if sponsorship is unavailable or transaction fails
 */
export async function sendSponsoredPayment(
  session: Secp256k1SigningSession,
  to: `0x${string}`,
  value: bigint,
): Promise<`0x${string}`> {
  if (!isSponsorshipAvailable()) {
    throw new Error('Sponsorship unavailable: NUXT_PUBLIC_PIMLICO_API_KEY not configured')
  }

  const bundlerUrl = `https://api.pimlico.io/v2/${chain.id}/rpc?apikey=${PIMLICO_API_KEY}`

  // Public client for chain queries
  const publicClient = createPublicClient({
    transport: http(),
    chain,
  })

  // Pimlico paymaster client
  const pimlicoClient = createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
  })

  // Convert Mera session to viem account (EOA)
  const eoaSigner = toViemAccount(session)

  // Create Kernel smart account (v0.3.1) with EOA as owner
  // Kernel is recommended for Monad testnet per official docs
  const smartAccount = await toKernelSmartAccount({
    client: publicClient,
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
    owners: [toAccount(eoaSigner)],
    version: '0.3.1',
    // index: 0n to ensure deterministic address
    index: 0n,
  })

  // Create smart account client with Pimlico sponsorship
  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain,
    bundlerTransport: http(bundlerUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        const gasPrice = await pimlicoClient.getUserOperationGasPrice()
        return gasPrice.fast
      },
    },
  })

  // Send sponsored transaction
  const txHash = await smartAccountClient.sendTransaction({
    to,
    value,
    data: '0x',
  })

  return txHash
}

/**
 * Returns the deterministic smart account address for a given EOA.
 * Useful for displaying to the user before sending.
 */
export async function getSmartAccountAddress(eoaAddress: `0x${string}`): Promise<`0x${string}`> {
  if (!isSponsorshipAvailable()) {
    throw new Error('Sponsorship unavailable')
  }

  const publicClient = createPublicClient({
    transport: http(),
    chain,
  })

  // Create a minimal EOA account for address derivation
  const tempAccount = toAccount({
    address: eoaAddress,
    signMessage: async () => { throw new Error('not implemented') },
    signTransaction: async () => { throw new Error('not implemented') },
    signTypedData: async () => { throw new Error('not implemented') },
  })

  const smartAccount = await toKernelSmartAccount({
    client: publicClient,
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
    owners: [tempAccount],
    version: '0.3.1',
    index: 0n,
  })

  return smartAccount.address
}
