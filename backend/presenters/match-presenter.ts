import type { PublicMatchDto } from '../../shared/contracts/match.js'
import type { MatchCard } from '../domain/match-deck.js'
import type { SoloMatch } from '../domain/match.js'
import {
  canAffordInvestigativeCrossing,
  investigativeCrossingCost,
} from '../domain/investigative-crossing.js'

export const MatchPresenter = {
  toPublicDto(match: SoloMatch): PublicMatchDto {
    const activeDeck = match.decks[match.activeInvestigatorId]

    return {
      id: match.id,
      mode: match.mode,
      createdAt: match.createdAt,
      preparedCardInstanceId: match.preparedCardInstanceId,
      preparedOperation: match.preparedOperation
        ? { operationId: match.preparedOperation.operationId }
        : undefined,
      activeInvestigatorId: match.activeInvestigatorId,
      supportInvestigatorId: match.supportInvestigatorId,
      round: match.round,
      status: match.status,
      examinedLocationsThisRound: match.examinedLocationsThisRound,
      hasUsedPassiveThisRound: match.hasUsedPassiveThisRound,
      hasReceivedSocialBonusThisRound: match.hasReceivedSocialBonusThisRound,
      hasSocialConnectionThisRound: match.hasSocialConnectionThisRound ?? false,
      hasUsedSocialConnectionThisRound: match.hasUsedSocialConnectionThisRound ?? false,
      hasUsedPressLeakConversationThisRound: match.hasUsedPressLeakConversationThisRound,
      hasFreeConnectionThisRound: match.hasFreeConnectionThisRound,
      hasUsedFreeConnectionThisRound: match.hasUsedFreeConnectionThisRound,
      investigativeCrossingCost: investigativeCrossingCost(match),
      canAffordInvestigativeCrossing: canAffordInvestigativeCrossing(match),
      currentLocationId: match.currentLocationId,
      unlockedLocations: match.unlockedLocations,
      hasUsedFreeMoveThisRound: match.hasUsedFreeMoveThisRound,
      hasDiscardedCardThisRound: match.hasDiscardedCardThisRound,
      hasUsedSupportThisRound: match.hasUsedSupportThisRound,
      actionPoints: match.actionPoints,
      journalEntries: match.journalEntries.map(toPublicJournalEntry),
      muralLinks: match.muralLinks.map(({ id, fromClueId, toClueId, round }) => ({
        id,
        fromClueId,
        toClueId,
        round,
      })),
      hypotheses: (match.hypotheses ?? []).map((hypothesis) => ({
        status: hypothesis.status,
        evidenceEntryIds: [...new Set(hypothesis.evidence.map((evidence) => evidence.entryId))],
        coveredAxes: [...new Set(hypothesis.evidence.map((evidence) => evidence.axis))],
        coherentRelationCount: hypothesis.coherentRelationIds.length,
      })),
      decks: {
        [match.activeInvestigatorId]: {
          hand: activeDeck.hand.map(toPublicCard),
          drawPileCount: activeDeck.drawPile.length,
          discardPileCount: activeDeck.discardPile.length,
        },
      },
    }
  },
}

function toPublicJournalEntry({
  caseEvidenceKey: _caseEvidenceKey,
  ...entry
}: SoloMatch['journalEntries'][number]) {
  return _caseEvidenceKey ? entry : { ...entry }
}

function toPublicCard(card: MatchCard) {
  return {
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    ownerId: card.ownerId,
    cost: card.cost,
    compatibleActions: card.compatibleActions,
    ...(card.temporary ? { temporary: true } : {}),
  }
}
