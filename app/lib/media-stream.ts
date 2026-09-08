export function keepCurrentMediaStream(
  stream: MediaStream,
  isCurrent: boolean,
): MediaStream | undefined {
  if (isCurrent)
    return stream

  stream.getTracks().forEach(track => track.stop())
}
