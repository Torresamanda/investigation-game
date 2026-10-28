import { MatchNotFoundError } from '../../domain/errors.js'
import type { OperationOption } from '../../domain/investigation-operation.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import type { MatchRepository } from '../ports/match-repository.js'

export class GetAvailableOperationsUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  execute(matchId: string): readonly OperationOption[] {
    const match = this.matchRepository.findById(matchId)
    if (!match) throw new MatchNotFoundError()
    if (match.status !== 'active') return []

    return this.caseContentRepository.getAvailableOperations(match)
  }
}
