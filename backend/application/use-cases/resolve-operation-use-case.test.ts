import { describe, expect, it } from 'vitest'
import { InMemoryMatchRepository } from '../../infrastructure/persistence/in-memory-match-repository.js'
import { createSoloMatch } from '../../domain/match.js'
import { ResolveOperationUseCase } from './resolve-operation-use-case.js'

function createMatch() {
  return createSoloMatch({
    id: 'match',
    activeInvestigatorId: 'livia',
    supportInvestigatorId: 'rafael',
    createdAt: '2026-10-26T00:00:00.000Z',
    nextRandomInt: () => 0,
  })
}

describe('ResolveOperationUseCase', () => {
  it('spends two general PA and wins after resolving a sustained prepared operation', () => {
    const repository = new InMemoryMatchRepository()
    const match = createMatch()
    repository.save({
      ...match,
      hypotheses: [
        {
          id: 'route',
          status: 'sustained',
          evidence: [],
          connectionIds: ['one', 'two'],
          hasOperationalInconsistency: false,
        },
      ],
      preparedOperation: { operationId: 'operation', hypothesisId: 'route', preparedAtRound: 5 },
    })

    const result = new ResolveOperationUseCase(repository).execute({ matchId: match.id })

    expect(result).toMatchObject({ status: 'won', actionPoints: { general: 3 } })
  })

  it('keeps the match active and records a useful observation after an incomplete operation', () => {
    const repository = new InMemoryMatchRepository()
    const match = createMatch()
    repository.save({
      ...match,
      hypotheses: [
        {
          id: 'route',
          status: 'contested',
          evidence: [],
          connectionIds: [],
          hasOperationalInconsistency: true,
        },
      ],
      preparedOperation: { operationId: 'operation', hypothesisId: 'route', preparedAtRound: 5 },
    })

    const result = new ResolveOperationUseCase(repository).execute({ matchId: match.id })

    expect(result.status).toBe('active')
    expect(result.journalEntries.at(-1)?.title).toBe('Inconsistência na operação')
  })
})
