/** Returns true if ending a session for this reason should set sessionExpired flag. */
export function shouldSetSessionExpired(reason: 'timer' | 'lock' | 'pagehide' | 'error', hasAddress: boolean): boolean {
  return (reason === 'timer' || reason === 'pagehide') && hasAddress
}
