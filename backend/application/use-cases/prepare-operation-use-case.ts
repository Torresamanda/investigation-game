import type { PrepareOperationCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import { DomainError, MatchNotFoundError } from '../../domain/errors.js'
import { canPrepareOperation, type OperationOption } from '../../domain/investigation-operation.js'
import type { SoloMatch } from '../../domain/match.js'

export class PrepareOperationUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly operationOptions: readonly OperationOption[],
  ) {}

  execute(command: PrepareOperationCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    if (match.status !== 'active') throw new DomainError('A partida já foi encerrada.')
    const operation = this.operationOptions.find((option) => option.id === command.operationId)
    const hypothesis = match.hypotheses?.find((item) => item.id === command.hypothesisId)
    if (!canPrepareOperation(hypothesis, operation)) {
      throw new DomainError('A linha de raciocínio ainda não sustenta esta operação.')
    }
    return this.repository.save({
      ...match,
      preparedOperation: {
        operationId: command.operationId,
        hypothesisId: command.hypothesisId,
        preparedAtRound: match.round,
      },
    })
  }
}
