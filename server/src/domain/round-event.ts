import type { PersonId } from '../../../shared/domain/identifiers.js'
import type { SoloMatch } from './match.js'

export function isPressLeakConversation(match: SoloMatch, personId: PersonId): boolean {
  return (
    match.round === 2 &&
    !match.hasUsedPressLeakConversationThisRound &&
    (personId === 'helena' || personId === 'davi')
  )
}

export function pressLeakConversationSurcharge(
  match: SoloMatch,
  personId: PersonId,
  hasCompatibleSocialCard: boolean,
): number {
  return isPressLeakConversation(match, personId) && !hasCompatibleSocialCard ? 1 : 0
}
