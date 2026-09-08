import type { PublicClient } from 'viem'
import { normalize } from 'viem/ens'

import { getPublicClient } from './ledger'

export async function resolveEnsNameWith(
  client: Pick<PublicClient, 'getEnsAddress'>,
  name: string,
): Promise<`0x${string}` | undefined> {
  try {
    const address = await client.getEnsAddress({ name: normalize(name) })
    return address ?? undefined
  }
  catch {
    return undefined
  }
}

export async function resolveEnsName(name: string): Promise<`0x${string}` | undefined> {
  return resolveEnsNameWith(getPublicClient(), name)
}
