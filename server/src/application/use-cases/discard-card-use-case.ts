import type { MatchRepository } from '../ports/match-repository.js'
import type { SoloMatch } from '../../domain/match.js'
import { drawToHand, INITIAL_HAND_SIZE, recycleCardFromHand } from '../../domain/match-deck.js'
import { assertMatchIsActive, DomainError, MatchNotFoundError } from '../../domain/errors.js'

export class DiscardCardUseCase {
  constructor(private readonly repository: MatchRepository) {}

  execute(matchId: string, instanceId: string): SoloMatch {
    const match = this.repository.findById(matchId)
    if (!match) throw new MatchNotFoundError()
    assertMatchIsActive(match.status)
    if (match.hasDiscardedCardThisRound) {
      throw new DomainError('Apenas uma carta pode ser descartada por rodada.')
    }

    const holderDeck = match.decks[match.activeInvestigatorId]
    const card = holderDeck.hand.find((handCard) => handCard.instanceId === instanceId)
    if (!card) throw new DomainError('A carta precisa estar na mão do investigador.')
    const ownerDeck = match.decks[card.ownerId]
    const discarded = recycleCardFromHand(holderDeck, ownerDeck, instanceId)
    const temporaryCards = discarded.holderDeck.hand.filter((handCard) => handCard.temporary)
    const regularDeck = {
      ...discarded.holderDeck,
      hand: discarded.holderDeck.hand.filter((handCard) => !handCard.temporary),
    }
    const replenishedRegularDeck = drawToHand(regularDeck, INITIAL_HAND_SIZE)
    const replenishedHolderDeck = {
      ...replenishedRegularDeck,
      hand: [...replenishedRegularDeck.hand, ...temporaryCards],
    }
    const decks = {
      ...match.decks,
      [match.activeInvestigatorId]: replenishedHolderDeck,
      [card.ownerId]:
        card.ownerId === match.activeInvestigatorId ? replenishedHolderDeck : discarded.ownerDeck,
    }

    const updated: SoloMatch = {
      ...match,
      decks,
      preparedCardInstanceId:
        match.preparedCardInstanceId === instanceId ? null : match.preparedCardInstanceId,
      hasDiscardedCardThisRound: true,
    }
    this.repository.save(updated)
    return updated
  }
}
