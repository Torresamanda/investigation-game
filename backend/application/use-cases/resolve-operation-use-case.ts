import { canPayAction, spendActionPoints } from '../../../shared/domain/action-points.js'
import type { ResolveOperationCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import { DomainError, MatchNotFoundError } from '../../domain/errors.js'
import { resolvePreparedOperation } from '../../domain/investigation-operation.js'
import type { SoloMatch } from '../../domain/match.js'

const operationCost = 2

export class ResolveOperationUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  execute(command: ResolveOperationCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    if (match.status !== 'active') throw new DomainError('A partida já foi encerrada.')
    if (!match.preparedOperation) throw new DomainError('Prepare uma operação antes de resolvê-la.')
    if (match.hasAttemptedOperationThisRound) {
      throw new DomainError('Só é possível resolver uma operação por rodada.')
    }
    if (!canPayAction(match.actionPoints, { action: 'move', amount: operationCost })) {
      throw new DomainError('São necessários 2 PA gerais para resolver a operação.')
    }
    const hypothesis = match.hypotheses?.find(
      (item) => item.id === match.preparedOperation?.hypothesisId,
    )
    const operation = this.caseContentRepository
      .getAvailableOperations(match)
      .find((item) => item.id === match.preparedOperation?.operationId)
    const isPrepared = resolvePreparedOperation(match.preparedOperation, hypothesis) === 'resolved'
    const outcome =
      isPrepared && operation
        ? this.caseContentRepository.resolveOperation(
            match,
            match.preparedOperation.operationId,
            match.preparedOperation.hypothesisId,
          )
        : undefined
    if (isPrepared && operation?.kind === 'verify') {
      return this.repository.save({
        ...match,
        actionPoints: spendActionPoints(match.actionPoints, {
          action: 'move',
          amount: operationCost,
        }),
        preparedOperation: undefined,
        hasAttemptedOperationThisRound: true,
        journalEntries: [
          ...match.journalEntries,
          {
            id: `journal-${match.journalEntries.length + 1}`,
            type: 'observation',
            title: 'Linha de raciocínio verificada',
            content:
              outcome?.observation ??
              'A verificação organizou os fatos já reunidos antes do encerramento.',
            locationId: match.currentLocationId,
            round: match.round,
            status: 'note',
          },
        ],
      })
    }
    if (isPrepared && operation?.kind === 'closure' && outcome?.isResolved) {
      return this.repository.save({
        ...match,
        actionPoints: spendActionPoints(match.actionPoints, {
          action: 'move',
          amount: operationCost,
        }),
        status: 'won',
        preparedOperation: undefined,
        hasAttemptedOperationThisRound: true,
      })
    }
    return this.repository.save({
      ...match,
      actionPoints: spendActionPoints(match.actionPoints, {
        action: 'move',
        amount: operationCost,
      }),
      preparedOperation: undefined,
      hasAttemptedOperationThisRound: true,
      hypotheses: (match.hypotheses ?? []).map((item) =>
        item.id === hypothesis?.id
          ? { ...item, status: 'contested', hasOperationalInconsistency: true }
          : item,
      ),
      journalEntries: [
        ...match.journalEntries,
        {
          id: `journal-${match.journalEntries.length + 1}`,
          type: 'observation',
          title: 'Inconsistência na operação',
          content:
            outcome?.observation ??
            'A operação revelou uma inconsistência na linha de raciocínio. Reavalie as evidências já reunidas antes de tentar outra abordagem.',
          locationId: match.currentLocationId,
          round: match.round,
          status: 'note',
          notificationSignal: 'action-failure',
        },
      ],
    })
  }
}
