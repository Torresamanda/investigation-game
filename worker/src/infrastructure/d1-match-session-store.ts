import type { D1DatabaseConnection } from './d1-match-store.js'

interface AuthorizedSessionRow {
  readonly authorized: number
}

const tokenByteLength = 32

export class D1MatchSessionStore {
  constructor(private readonly database: D1DatabaseConnection) {}

  async issue(matchId: string): Promise<string> {
    const token = createOpaqueToken()
    await this.database
      .prepare('INSERT INTO match_sessions (token_hash, match_id) VALUES (?, ?)')
      .bind(await hashToken(token), matchId)
      .run()
    return token
  }

  async authorizes(matchId: string, token: string | null): Promise<boolean> {
    if (!token || token.length !== tokenByteLength * 2) return false
    const session = await this.database
      .prepare('SELECT 1 AS authorized FROM match_sessions WHERE token_hash = ? AND match_id = ?')
      .bind(await hashToken(token), matchId)
      .first<AuthorizedSessionRow>()
    return session?.authorized === 1
  }
}

function createOpaqueToken(): string {
  const bytes = new Uint8Array(tokenByteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashToken(token: string): Promise<string> {
  const encodedToken = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', encodedToken)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
