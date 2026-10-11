/** Milliseconds left before `startedAt + windowMs`, never negative. */
export function remainingMs(startedAt: number, now: number, windowMs: number): number {
  return Math.max(0, startedAt + windowMs - now)
}

/** 272_400 → "4:33" (rounds up so the display hits 0:00 only at the deadline). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
