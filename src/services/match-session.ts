const storageKeyPrefix = 'cidade-das-brumas:match-session:'

export function saveMatchSession(matchId: string, token: string): void {
  getStorage()?.setItem(storageKey(matchId), token)
}

export function getMatchSession(matchId: string): string | null {
  return getStorage()?.getItem(storageKey(matchId)) ?? null
}

function storageKey(matchId: string): string {
  return `${storageKeyPrefix}${matchId}`
}

function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
