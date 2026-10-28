import { canPayAction } from '../../shared/domain/action-points.js'
import type { SoloMatch } from './match.js'
import {
  findConfirmedEvidenceRelation,
  hasAvailableContestableStatementRelation,
  hasInvestigativeRelation,
} from './evidence-relation.js'

const crossingCardIds = new Set(['route-map', 'comparative-magnifier', 'cross-reference'])

export function investigativeCrossingCost(match: SoloMatch): number {
  const preparedCard = match.preparedCardInstanceId
    ? match.decks[match.activeInvestigatorId].hand.find(
        (card) => card.instanceId === match.preparedCardInstanceId,
      )
    : undefined
  if (preparedCard && !isInvestigativeCrossingCard(preparedCard.definitionId)) return 1
  const hasCrossingCard =
    preparedCard && !preparedCard.temporary && crossingCardIds.has(preparedCard.definitionId)
  const hasRoundDiscount =
    (match.hasFreeConnectionThisRound && !match.hasUsedFreeConnectionThisRound) ||
    (match.hasSocialConnectionThisRound && !match.hasUsedSocialConnectionThisRound)

  return hasCrossingCard || hasRoundDiscount ? 0 : 1
}

export function canAffordInvestigativeCrossing(match: SoloMatch): boolean {
  const preparedCard = match.preparedCardInstanceId
    ? match.decks[match.activeInvestigatorId].hand.find(
        (card) => card.instanceId === match.preparedCardInstanceId,
      )
    : undefined
  if (preparedCard && !isInvestigativeCrossingCard(preparedCard.definitionId)) return false

  const hasUnvalidatedRelation = match.journalEntries.some((fromEntry) =>
    match.journalEntries.some(
      (toEntry) =>
        findConfirmedEvidenceRelation(match.journalEntries, fromEntry.id, toEntry.id) &&
        !hasInvestigativeRelation(match.investigativeRelations ?? [], fromEntry.id, toEntry.id),
    ),
  )
  return (
    (hasUnvalidatedRelation ||
      hasAvailableContestableStatementRelation(
        match.journalEntries,
        match.contestableCrossings ?? [],
      )) &&
    canPayAction(match.actionPoints, {
      action: 'research',
      amount: investigativeCrossingCost(match),
    })
  )
}

export function isInvestigativeCrossingCard(definitionId: string): boolean {
  return crossingCardIds.has(definitionId)
}
