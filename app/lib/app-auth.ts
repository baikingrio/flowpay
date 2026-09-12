export interface AppAuthSession {
  provider: 'github'
  login: string
  name: string
  avatarUrl?: string
  mock: true
  authAt: number
}

const STORAGE_KEY = 'flowpay.appAuth'

function defaultStorage(): Storage | undefined {
  if (!import.meta.client)
    return undefined
  return window.localStorage
}

function isValidSession(value: unknown): value is AppAuthSession {
  if (typeof value !== 'object' || value === null)
    return false
  const obj = value as Record<string, unknown>
  return (
    obj.provider === 'github'
    && typeof obj.login === 'string'
    && typeof obj.name === 'string'
    && (obj.avatarUrl === undefined || typeof obj.avatarUrl === 'string')
    && obj.mock === true
    && typeof obj.authAt === 'number'
  )
}

export function readAppAuth(storage?: Storage): AppAuthSession | undefined {
  const s = storage ?? defaultStorage()
  const raw = s?.getItem(STORAGE_KEY)
  if (!raw)
    return undefined
  try {
    const parsed = JSON.parse(raw)
    return isValidSession(parsed) ? parsed : undefined
  }
  catch {
    return undefined
  }
}

export function writeAppAuth(session: AppAuthSession, storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearAppAuth(storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.removeItem(STORAGE_KEY)
}
