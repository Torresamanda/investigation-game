import { describe, expect, it } from 'vitest'
import { createSoloMatch } from '../domain/match.js'
import { SqliteMatchRepository } from './sqlite-match-repository.js'

describe('SqliteMatchRepository', () => {
  it('recupera a partida completa salva em SQLite', () => {
    const repository = new SqliteMatchRepository(':memory:')
    const match = createSoloMatch({
      id: 'match-1',
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
      createdAt: '2026-10-22T12:00:00.000Z',
    })

    repository.save(match)

    expect(repository.findById(match.id)).toEqual(match)
  })
})
