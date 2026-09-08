import { describe, expect, it, vi } from 'vitest'
import { resolveEnsNameWith } from '../app/lib/ens'

const ADDR = '0x000000000000000000000000000000000000dEaD'

describe('resolveEnsNameWith', () => {
  it('returns address when client resolves', async () => {
    const client = {
      getEnsAddress: vi.fn().mockResolvedValue(ADDR),
    }
    await expect(resolveEnsNameWith(client, 'alice.eth')).resolves.toBe(ADDR)
    expect(client.getEnsAddress).toHaveBeenCalledWith({ name: 'alice.eth' })
  })

  it('returns undefined when client throws', async () => {
    const client = {
      getEnsAddress: vi.fn().mockRejectedValue(new Error('network')),
    }
    await expect(resolveEnsNameWith(client, 'alice.eth')).resolves.toBeUndefined()
  })
})
