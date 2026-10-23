import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
      nextRandomInt: () => 0,
    })

    repository.save(match)

    expect(repository.findById(match.id)).toEqual(match)
  })

  it('rejeita a gravação desatualizada para preservar uma alteração concorrente', () => {
    const databaseDirectory = mkdtempSync(join(tmpdir(), 'investigation-game-'))
    const databaseFilename = join(databaseDirectory, 'matches.sqlite')
    const firstRepository = new SqliteMatchRepository(databaseFilename)
    const secondRepository = new SqliteMatchRepository(databaseFilename)
    const match = createSoloMatch({
      id: 'match-1',
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
      createdAt: '2026-10-22T12:00:00.000Z',
      nextRandomInt: () => 0,
    })

    firstRepository.save(match)
    const firstSnapshot = firstRepository.findById(match.id)
    const staleSnapshot = secondRepository.findById(match.id)
    if (!firstSnapshot || !staleSnapshot) throw new Error('A partida precisa estar disponível.')

    firstRepository.save({ ...firstSnapshot, currentLocationId: 'security' })

    expect(() =>
      secondRepository.save({ ...staleSnapshot, currentLocationId: 'laboratory' }),
    ).toThrow('A partida foi alterada em outra requisição. Tente novamente.')
    expect(firstRepository.findById(match.id)).toMatchObject({ currentLocationId: 'security' })

    firstRepository.close()
    secondRepository.close()
    rmSync(databaseDirectory, { recursive: true, force: true })
  })
})
