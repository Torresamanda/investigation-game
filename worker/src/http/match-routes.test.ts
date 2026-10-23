import { describe, expect, it } from 'vitest'
import { handleMatchRequest } from './match-routes.js'
import type { D1DatabaseConnection } from '../infrastructure/d1-match-store.js'

const unusedDatabase: D1DatabaseConnection = {
  prepare() {
    throw new Error('O banco não deve ser consultado para contratos inválidos.')
  },
}

describe('D1 match routes', () => {
  it('rejects an invalid conversation participant before querying D1', async () => {
    const response = await handleMatchRequest(
      new Request('https://game.test/api/matches/match-1/conversations/unknown?locationId=office'),
      unusedDatabase,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ message: 'Pessoa ou local inválido.' })
  })

  it.each([
    ['/api/matches/match-1/connections', { fromClueId: '', toClueId: 'clue-2' }],
    [
      '/api/matches/match-1/accuse',
      {
        suspectId: 'unknown',
        meansClueId: 'clue-1',
        opportunityClueId: 'clue-2',
        linkClueId: 'clue-3',
      },
    ],
    ['/api/matches/match-1/conversations/helena/questions/question-1', { locationId: 'unknown' }],
  ])('rejects invalid mutation contracts for %s', async (path, body) => {
    const response = await handleMatchRequest(
      new Request(`https://game.test${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      unusedDatabase,
    )

    expect(response.status).toBe(400)
  })
})
