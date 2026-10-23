import type { MatchRepository } from '../ports/match-repository.js'
import { drawCardFromDeck } from '../../domain/match-deck.js'
import type { MatchCard } from '../../domain/match-deck.js'
import type { SoloMatch } from '../../domain/match.js'
import { assertMatchIsActive, DomainError, MatchNotFoundError } from '../../domain/errors.js'

export class RequestSupportCardUseCase {
  constructor(private readonly repository: MatchRepository) {}

  execute(matchId: string): SoloMatch {
    const match = this.repository.findById(matchId)
    if (!match) throw new MatchNotFoundError()
    assertMatchIsActive(match.status)
    if (match.hasUsedSupportThisRound) {
      throw new DomainError('O apoio já foi acionado nesta rodada.')
    }

    const supportDeck = match.decks[match.supportInvestigatorId]
    const { deck: updatedSupportDeck, card } = drawCardFromDeck(supportDeck)
    if (!card) throw new DomainError('O apoio não tem cartas disponíveis.')

    const originalCost = card.originalCost ?? card.cost
    const discountedCard: MatchCard = {
      ...card,
      cost: Math.max(0, originalCost - 1) as MatchCard['cost'],
      originalCost,
    }
    const activeDeck = match.decks[match.activeInvestigatorId]
    const updated: SoloMatch = {
      ...match,
      hasUsedSupportThisRound: true,
      decks: {
        ...match.decks,
        [match.activeInvestigatorId]: {
          ...activeDeck,
          hand: [...activeDeck.hand, discountedCard],
        },
        [match.supportInvestigatorId]: updatedSupportDeck,
      },
    }
    this.repository.save(updated)
    return updated
  }
}
