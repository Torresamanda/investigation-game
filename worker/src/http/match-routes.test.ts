import { describe, expect, it } from 'vitest'
import { handleMatchRequest } from './match-routes.js'
import type { D1DatabaseConnection, D1PreparedStatement } from '../infrastructure/d1-match-store.js'

interface StoredMatchRow {
  readonly state: string
  readonly version: number
}

class InMemoryD1Database implements D1DatabaseConnection {
  private readonly matches = new Map<string, StoredMatchRow>()
  private readonly sessions = new Map<string, string>()

  prepare(query: string): D1PreparedStatement {
    let values: readonly unknown[] = []
    return {
      bind(...boundValues) {
        values = boundValues
        return this
      },
      first: async <T>() => this.readFirst<T>(query, values),
      run: async () => this.runStatement(query, values),
    }
  }

  private async readFirst<T>(query: string, values: readonly unknown[]): Promise<T | null> {
    if (query.startsWith('SELECT state, version FROM matches WHERE id = ?')) {
      return (this.matches.get(String(values[0])) ?? null) as T | null
    }
    if (query.startsWith('SELECT 1 AS authorized FROM match_sessions')) {
      const isAuthorized = this.sessions.get(String(values[0])) === String(values[1])
      return (isAuthorized ? { authorized: 1 } : null) as T | null
    }
    return null
  }

  private async runStatement(
    query: string,
    values: readonly unknown[],
  ): Promise<{ readonly meta: { readonly changes: number } }> {
    if (query.startsWith('INSERT INTO matches')) {
      this.matches.set(String(values[0]), {
        state: String(values[1]),
        version: Number(values[2]),
      })
    }
    if (query.startsWith('INSERT INTO match_sessions')) {
      this.sessions.set(String(values[0]), String(values[1]))
    }
    return { meta: { changes: 1 } }
  }
}

interface CreatedMatch {
  readonly id: string
  readonly token: string
}

async function createMatch(database: D1DatabaseConnection): Promise<CreatedMatch> {
  const response = await handleMatchRequest(
    new Request('https://game.test/api/matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' }),
    }),
    database,
  )
  const match = (await response.json()) as { id: string }
  const token = response.headers.get('x-match-token')
  if (!token) throw new Error('A criação não retornou o token de sessão.')
  return { id: match.id, token }
}

function authorizedHeaders(token: string): HeadersInit {
  return { 'x-match-token': token }
}

describe('D1 match routes', () => {
  it('issues a session token and requires it to read a match', async () => {
    const database = new InMemoryD1Database()
    const match = await createMatch(database)

    const withoutToken = await handleMatchRequest(
      new Request(`https://game.test/api/matches/${match.id}`),
      database,
    )
    const withToken = await handleMatchRequest(
      new Request(`https://game.test/api/matches/${match.id}`, {
        headers: authorizedHeaders(match.token),
      }),
      database,
    )
    const mutationWithoutToken = await handleMatchRequest(
      new Request(`https://game.test/api/matches/${match.id}/actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'examine', locationId: 'gallery' }),
      }),
      database,
    )

    expect(withoutToken.status).toBe(401)
    expect(withToken.status).toBe(200)
    expect(mutationWithoutToken.status).toBe(401)
  })

  it('rejects a token issued for another match', async () => {
    const database = new InMemoryD1Database()
    const firstMatch = await createMatch(database)
    const secondMatch = await createMatch(database)

    const response = await handleMatchRequest(
      new Request(`https://game.test/api/matches/${firstMatch.id}`, {
        headers: authorizedHeaders(secondMatch.token),
      }),
      database,
    )

    expect(response.status).toBe(401)
  })

  it('validates protected conversation and journal requests after authorization', async () => {
    const database = new InMemoryD1Database()
    const match = await createMatch(database)

    const conversation = await handleMatchRequest(
      new Request(
        `https://game.test/api/matches/${match.id}/conversations/unknown?locationId=office`,
        { headers: authorizedHeaders(match.token) },
      ),
      database,
    )
    const connection = await handleMatchRequest(
      new Request(`https://game.test/api/matches/${match.id}/connections`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authorizedHeaders(match.token) },
        body: JSON.stringify({ fromClueId: '', toClueId: 'clue-2' }),
      }),
      database,
    )

    expect(conversation.status).toBe(400)
    expect(connection.status).toBe(400)
  })
})
