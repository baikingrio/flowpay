import { describe, expect, it, vi } from 'vitest'
import { keepCurrentMediaStream, keepCurrentScannerControls } from '../app/lib/media-stream'

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

describe('keepCurrentScannerControls', () => {
  it('stops controls created for a stale camera generation', () => {
    const controls = { stop: vi.fn() }

    expect(keepCurrentScannerControls(controls, false)).toBeUndefined()
    expect(controls.stop).toHaveBeenCalledOnce()
  })
})

function fakeStream() {
  const stop = vi.fn()
  const stream = {
    getTracks: () => [{ stop }],
  } as unknown as MediaStream

  return { ...stream, stop }
}
