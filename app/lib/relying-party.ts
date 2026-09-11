import type { PasskeyRelyingParty } from '@category-labs/mera'

export function relyingParty(): PasskeyRelyingParty {
  if (!import.meta.client) {
    throw new Error('Passkey relying party is only available in the browser')
  }

  return {
    id: window.location.hostname,
    name: 'Flowpay',
  }
}
