import { describe, expect, it } from 'vitest'
import { MatchService } from '../match-service.js'
import { InMemoryMatchRepository } from '../../infrastructure/persistence/in-memory-match-repository.js'

describe('CancelOperationUseCase', () => {
  it('clears a prepared operation without spending action points', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'cancel-operation')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({
      ...match,
      preparedOperation: {
        operationId: 'verify-the-theory',
        hypothesisId: 'case01-primary-operation',
        preparedAtRound: 1,
      },
    })

    const cancelled = service.cancelOperation(match.id)

    expect(cancelled.preparedOperation).toBeUndefined()
    expect(cancelled.actionPoints).toEqual(match.actionPoints)
  })
})
