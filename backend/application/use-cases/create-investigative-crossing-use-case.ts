import { canPayAction, spendActionPoints } from '../../../shared/domain/action-points.js'
import type { CreateInvestigativeCrossingCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import { assertMatchIsActive, DomainError, MatchNotFoundError } from '../../domain/errors.js'
import {
  findConfirmedEvidenceRelation,
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

    const relation = findConfirmedEvidenceRelation(
      match.journalEntries,
      command.fromClueId,
      command.toClueId,
    )
    if (!relation) throw new DomainError('O cruzamento exige duas pistas confirmadas e coerentes.')
    if (
      hasInvestigativeRelation(
        match.investigativeRelations ?? [],
        command.fromClueId,
        command.toClueId,
      )
    ) {
      throw new DomainError('Esse cruzamento investigativo já foi validado.')
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
    const investigativeRelation = {
      id: this.createId(),
      fromClueId: command.fromClueId,
      toClueId: command.toClueId,
      round: match.round,
      hypothesisThreadId: relation.hypothesisThreadId,
    }
    const relationObservation = {
      id: `journal-${match.journalEntries.length + 1}`,
      type: 'observation' as const,
      title: 'Relação investigativa validada',
      content: `O cruzamento confirmou uma relação coerente entre “${relation.fromEntry.title}” e “${relation.toEntry.title}”.`,
      locationId: match.currentLocationId,
      round: match.round,
      status: 'note' as const,
      relatedEntryIds: [relation.fromEntry.id, relation.toEntry.id],
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

    const updatedRelations = [...(match.investigativeRelations ?? []), investigativeRelation]
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
      hypotheses: synchronizeInvestigationHypotheses(
        match.journalEntries,
        updatedRelations,
        match.hypotheses ?? [],
      ),
      journalEntries: [...match.journalEntries, relationObservation],
    }
    return this.repository.save(updated)
  }
}
