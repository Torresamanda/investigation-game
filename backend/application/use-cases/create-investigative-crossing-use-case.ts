import { canPayAction, spendActionPoints } from '../../../shared/domain/action-points.js'
import type { CreateInvestigativeCrossingCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import { assertMatchIsActive, DomainError, MatchNotFoundError } from '../../domain/errors.js'
import {
  findConfirmedEvidenceRelation,
  findContestableStatementRelation,
  hasInvestigativeRelation,
} from '../../domain/evidence-relation.js'
import {
  investigativeCrossingCost,
  isInvestigativeCrossingCard,
} from '../../domain/investigative-crossing.js'
import { recycleCardFromHand } from '../../domain/match-deck.js'
import { synchronizeInvestigationHypotheses } from '../../domain/investigation-hypothesis.js'
import type { SoloMatch } from '../../domain/match.js'

export class CreateInvestigativeCrossingUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly createId: () => string,
  ) {}

  execute(command: CreateInvestigativeCrossingCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    assertMatchIsActive(match.status)

    const evidenceRelation = findConfirmedEvidenceRelation(
      match.journalEntries,
      command.fromClueId,
      command.toClueId,
    )
    const statementRelation = findContestableStatementRelation(
      match.journalEntries,
      command.fromClueId,
      command.toClueId,
    )
    const reversedStatementRelation = findContestableStatementRelation(
      match.journalEntries,
      command.toClueId,
      command.fromClueId,
    )
    const contestableRelation = statementRelation ?? reversedStatementRelation
    if (!evidenceRelation && !contestableRelation) {
      throw new DomainError(
        'O cruzamento exige pistas confirmadas coerentes ou uma declaração contestável ligada à evidência correspondente.',
      )
    }
    if (
      evidenceRelation &&
      hasInvestigativeRelation(
        match.investigativeRelations ?? [],
        command.fromClueId,
        command.toClueId,
      )
    ) {
      throw new DomainError('Esse cruzamento investigativo já foi validado.')
    }
    if (
      contestableRelation &&
      match.contestableCrossings?.some(
        (crossing) =>
          crossing.statementId === contestableRelation.statement.id &&
          crossing.clueId === contestableRelation.clue.id,
      )
    ) {
      throw new DomainError('Essa declaração já foi cruzada com esta evidência.')
    }

    const cost = investigativeCrossingCost(match)
    if (
      !canPayAction(match.actionPoints, {
        action: 'research',
        amount: cost,
      })
    ) {
      throw new DomainError('É preciso ter 1 PA geral ou de pesquisa para cruzar as evidências.')
    }

    const activeDeck = match.decks[match.activeInvestigatorId]
    const preparedCard = match.preparedCardInstanceId
      ? activeDeck.hand.find((card) => card.instanceId === match.preparedCardInstanceId)
      : undefined
    if (preparedCard && !isInvestigativeCrossingCard(preparedCard.definitionId)) {
      throw new DomainError('A carta preparada não serve para este cruzamento investigativo.')
    }
    const usesCrossingCard = Boolean(
      preparedCard && isInvestigativeCrossingCard(preparedCard.definitionId),
    )
    const usesRoundDiscount =
      !usesCrossingCard && match.hasFreeConnectionThisRound && !match.hasUsedFreeConnectionThisRound
    const usesSocialDiscount =
      !usesCrossingCard &&
      !usesRoundDiscount &&
      match.hasSocialConnectionThisRound &&
      !match.hasUsedSocialConnectionThisRound
    const investigativeRelation = evidenceRelation
      ? {
          id: this.createId(),
          fromClueId: command.fromClueId,
          toClueId: command.toClueId,
          round: match.round,
          hypothesisThreadId: evidenceRelation.hypothesisThreadId,
        }
      : undefined
    const contestableCrossing = contestableRelation
      ? {
          statementId: contestableRelation.statement.id,
          clueId: contestableRelation.clue.id,
          result: contestableRelation.statement.contestableCrossing!.result,
          round: match.round,
        }
      : undefined
    const relationObservation = {
      id: `journal-${match.journalEntries.length + 1}`,
      type: 'observation' as const,
      title: contestableRelation ? 'Declaração confrontada' : 'Relação investigativa validada',
      content: contestableRelation
        ? contestableRelation.statement.contestableCrossing!.observation
        : `O cruzamento confirmou uma relação coerente entre “${evidenceRelation!.fromEntry.title}” e “${evidenceRelation!.toEntry.title}”.`,
      locationId: match.currentLocationId,
      round: match.round,
      status: 'note' as const,
      relatedEntryIds: contestableRelation
        ? [contestableRelation.statement.id, contestableRelation.clue.id]
        : [evidenceRelation!.fromEntry.id, evidenceRelation!.toEntry.id],
    }

    let decks = match.decks
    if (usesCrossingCard && preparedCard) {
      const recycled = recycleCardFromHand(
        activeDeck,
        match.decks[preparedCard.ownerId],
        preparedCard.instanceId,
      )
      decks = {
        ...match.decks,
        [match.activeInvestigatorId]: recycled.holderDeck,
        [preparedCard.ownerId]: recycled.ownerDeck,
      }
    }

    const updatedRelations = investigativeRelation
      ? [...(match.investigativeRelations ?? []), investigativeRelation]
      : (match.investigativeRelations ?? [])
    const updated: SoloMatch = {
      ...match,
      actionPoints: spendActionPoints(match.actionPoints, {
        action: 'research',
        amount: cost,
      }),
      decks,
      preparedCardInstanceId: usesCrossingCard ? null : match.preparedCardInstanceId,
      hasUsedFreeConnectionThisRound: match.hasUsedFreeConnectionThisRound || usesRoundDiscount,
      hasUsedSocialConnectionThisRound:
        match.hasUsedSocialConnectionThisRound || usesSocialDiscount,
      investigativeRelations: updatedRelations,
      contestableCrossings: contestableCrossing
        ? [...(match.contestableCrossings ?? []), contestableCrossing]
        : (match.contestableCrossings ?? []),
      hypotheses: synchronizeInvestigationHypotheses(
        match.journalEntries,
        updatedRelations,
        match.hypotheses ?? [],
      ),
      journalEntries: [
        ...match.journalEntries.map((entry) =>
          entry.id === contestableRelation?.statement.id &&
          contestableRelation.statement.contestableCrossing!.result === 'refuted'
            ? { ...entry, status: 'refuted' as const }
            : entry,
        ),
        relationObservation,
      ],
    }
    return this.repository.save(updated)
  }
}
