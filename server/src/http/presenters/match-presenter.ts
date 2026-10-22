import type { PublicMatchDto } from '../../../../shared/contracts/match.js'
import type { MatchCard } from '../../domain/match-deck.js'
import type { SoloMatch } from '../../domain/match.js'
import { findClueConnectionCandidate } from '../../domain/clue-connection.js'

export const MatchPresenter = {
  toPublicDto(match: SoloMatch): PublicMatchDto {
    const activeDeck = match.decks[match.activeInvestigatorId]

    return {
      id: match.id,
      mode: match.mode,
      createdAt: match.createdAt,
      preparedCardInstanceId: match.preparedCardInstanceId,
      activeInvestigatorId: match.activeInvestigatorId,
      supportInvestigatorId: match.supportInvestigatorId,
      round: match.round,
      examinedLocationsThisRound: match.examinedLocationsThisRound,
      hasUsedPassiveThisRound: match.hasUsedPassiveThisRound,
      hasReceivedSocialBonusThisRound: match.hasReceivedSocialBonusThisRound,
      canCreateInvestigatorConnection:
        match.activeInvestigatorId === 'otavio' && Boolean(findClueConnectionCandidate(match)),
      currentLocationId: match.currentLocationId,
      unlockedLocations: match.unlockedLocations,
      hasUsedFreeMoveThisRound: match.hasUsedFreeMoveThisRound,
      hasDiscardedCardThisRound: match.hasDiscardedCardThisRound,
      actionPoints: match.actionPoints,
      journalEntries: match.journalEntries,
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

function toPublicCard(card: MatchCard) {
  return {
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    cost: card.cost,
    compatibleActions: card.compatibleActions,
    ...(card.temporary ? { temporary: true } : {}),
  }
}
