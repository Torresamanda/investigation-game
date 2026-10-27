import type { MatchRepository } from '../ports/match-repository.js'
import { DomainError, MatchNotFoundError } from '../../domain/errors.js'
import type { SoloMatch } from '../../domain/match.js'

export class CancelOperationUseCase {
  constructor(private readonly repository: MatchRepository) {}

  execute(matchId: string): SoloMatch {
    const match = this.repository.findById(matchId)
    if (!match) throw new MatchNotFoundError()
    if (match.status !== 'active') throw new DomainError('A partida já foi encerrada.')
    if (!match.preparedOperation) throw new DomainError('Não há operação preparada para cancelar.')
    return this.repository.save({ ...match, preparedOperation: undefined })
  }
}
