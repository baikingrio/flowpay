import { describe, expect, it, vi } from 'vitest'
import { keepCurrentMediaStream } from '../app/lib/media-stream'

describe('keepCurrentMediaStream', () => {
  it('returns the stream while its camera generation is current', () => {
    const stream = fakeStream()

    expect(keepCurrentMediaStream(stream, true)).toBe(stream)
    expect(stream.stop).not.toHaveBeenCalled()
  })

  it('stops and rejects a stream from a stale camera generation', () => {
    const stream = fakeStream()

    expect(keepCurrentMediaStream(stream, false)).toBeUndefined()
    expect(stream.stop).toHaveBeenCalledOnce()
  })
})

function fakeStream() {
  const stop = vi.fn()
  const stream = {
    getTracks: () => [{ stop }],
  } as unknown as MediaStream

  return { ...stream, stop }
}
