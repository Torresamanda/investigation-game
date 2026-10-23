import { canPayAction, spendActionPoints } from '../../../shared/domain/action-points.js'
import type { SoloMatch } from '../../domain/match.js'
import { DomainError, MatchNotFoundError } from '../../domain/errors.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import type { MatchRepository } from '../ports/match-repository.js'
import type { AccuseSuspectCommand } from '../commands.js'

const accusationCost = 3

export class AccuseSuspectUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  execute(command: AccuseSuspectCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    if (match.status !== 'active') throw new DomainError('A partida já foi encerrada.')
    if (!match.canAccuse || match.round < 5 || match.round > 6) {
      throw new DomainError('A acusação só pode ser apresentada nas Rodadas 5 ou 6.')
    }

    const selectedClues = getSelectedConfirmedClues(match, command)
    if (
      countConfirmedClues(match) < 3 ||
      match.journalConnections.length < 2 ||
      selectedClues.some((clue) => !clue)
    ) {
      throw new DomainError('O dossiê ainda não está sustentado.')
    }
    if (!canPayAction(match.actionPoints, { action: 'move', amount: accusationCost })) {
      throw new DomainError('São necessários 3 PA gerais para apresentar a acusação.')
    }

    const [meansClue, opportunityClue, linkClue] = selectedClues
    const isCorrectAccusation = this.caseContentRepository.isAccusationCorrect(command.suspectId, {
      means: meansClue?.caseEvidenceKey,
      opportunity: opportunityClue?.caseEvidenceKey,
      link: linkClue?.caseEvidenceKey,
    })
    const updated: SoloMatch = {
      ...match,
      status: isCorrectAccusation ? 'won' : 'lost',
      canAccuse: false,
      actionPoints: spendActionPoints(match.actionPoints, {
        action: 'move',
        amount: accusationCost,
      }),
      preparedCardInstanceId: null,
    }
    return this.repository.save(updated)
  }
}

function countConfirmedClues(match: SoloMatch): number {
  return match.journalEntries.filter(
    (entry) => entry.type === 'clue' && entry.status === 'confirmed',
  ).length
}

function getSelectedConfirmedClues(
  match: SoloMatch,
  selection: Pick<AccuseSuspectCommand, 'meansClueId' | 'opportunityClueId' | 'linkClueId'>,
) {
  const selectedIds = [selection.meansClueId, selection.opportunityClueId, selection.linkClueId]
  return selectedIds.map((id) =>
    match.journalEntries.find(
      (entry) => entry.id === id && entry.type === 'clue' && entry.status === 'confirmed',
    ),
  )
}
