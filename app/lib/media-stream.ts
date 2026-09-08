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
