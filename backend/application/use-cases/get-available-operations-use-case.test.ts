import { describe, expect, it } from 'vitest'
import { MatchNotFoundError } from '../../domain/errors.js'
import { InMemoryMatchRepository } from '../../infrastructure/persistence/in-memory-match-repository.js'
import { Case01ContentRepository } from '../../infrastructure/content/case01-content-repository.js'
import { MatchService } from '../match-service.js'
import { GetAvailableOperationsUseCase } from './get-available-operations-use-case.js'

describe('GetAvailableOperationsUseCase', () => {
  it('returns no operations after the match has ended', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'ended-match')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({ ...match, status: 'won' })
    const useCase = new GetAvailableOperationsUseCase(repository, new Case01ContentRepository())

    expect(useCase.execute(match.id)).toEqual([])
  })

  it('raises a semantic not found error for an unknown match', () => {
    const useCase = new GetAvailableOperationsUseCase(
      new InMemoryMatchRepository(),
      new Case01ContentRepository(),
    )

    expect(() => useCase.execute('missing-match')).toThrow(MatchNotFoundError)
  })
})
