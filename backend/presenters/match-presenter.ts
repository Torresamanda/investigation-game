import type { PublicMatchDto } from '../../shared/contracts/match.js'
import type { MatchCard } from '../domain/match-deck.js'
import type { SoloMatch } from '../domain/match.js'
import type { ActionOpportunities } from '../../shared/contracts/investigation-opportunity.js'
import {
  canAffordInvestigativeCrossing,
  investigativeCrossingCost,
} from '../domain/investigative-crossing.js'

export const MatchPresenter = {
  toPublicDto(match: SoloMatch, actionOpportunities?: ActionOpportunities): PublicMatchDto {
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
      journalEntries: match.journalEntries.map((entry) =>
        toPublicJournalEntry(entry, match.journalEntries),
      ),
      notificationEvents: match.notificationEvents ?? [],
      ...(actionOpportunities ? { actionOpportunities } : {}),
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

function toPublicJournalEntry(
  {
    caseEvidenceKey: _caseEvidenceKey,
    contestableCrossing,
    notificationSignal,
    actionAttempt: _actionAttempt,
    ...entry
  }: SoloMatch['journalEntries'][number],
  entries: SoloMatch['journalEntries'],
) {
  void _caseEvidenceKey
  void notificationSignal
  void _actionAttempt
  const contestableWithEntryIds = contestableCrossing
    ? entries.flatMap((candidate) =>
        candidate.type === 'clue' &&
        candidate.status === 'confirmed' &&
        candidate.caseEvidenceKey &&
        contestableCrossing.evidenceKeys.includes(candidate.caseEvidenceKey)
          ? [candidate.id]
          : [],
      )
    : undefined
  return contestableWithEntryIds?.length ? { ...entry, contestableWithEntryIds } : entry
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
