export function keepCurrentMediaStream(
  stream: MediaStream,
  isCurrent: boolean,
): MediaStream | undefined {
  if (isCurrent)
    return stream

  stream.getTracks().forEach(track => track.stop())
}

export function keepCurrentScannerControls<T extends { stop: () => void }>(
  controls: T,
  isCurrent: boolean,
): T | undefined {
  if (isCurrent)
    return controls

  controls.stop()
}

export type CameraFailure = 'denied' | 'unavailable'

/** Map a getUserMedia / scanner start error to a user-facing failure kind. */
export function classifyCameraError(error: unknown): CameraFailure {
  const name = (error as { name?: string } | null)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError')
    return 'denied'
  return 'unavailable'
}

/** True when the video track exposes a controllable torch (Android Chrome; not iOS Safari). */
export function trackSupportsTorch(track: MediaStreamTrack | undefined): boolean {
  if (!track || typeof track.getCapabilities !== 'function')
    return false
  try {
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
    return Boolean(capabilities.torch)
  }
  catch {
    return false
  }
}
