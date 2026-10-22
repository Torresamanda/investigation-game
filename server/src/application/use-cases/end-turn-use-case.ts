import type { MatchRepository } from '../ports/match-repository.js'
import { actionPointsFor, type SoloMatch } from '../../domain/match.js'
import { drawToHand, INITIAL_HAND_SIZE } from '../../domain/match-deck.js'
import { DomainError, MatchNotFoundError } from '../../domain/errors.js'

export class EndTurnUseCase {
  constructor(private readonly repository: MatchRepository) {}

  execute(matchId: string): SoloMatch {
    const match = this.repository.findById(matchId)
    if (!match) throw new MatchNotFoundError()
    if (match.round >= 6) throw new DomainError('A missão já alcançou o limite de rodadas.')

    const updated: SoloMatch = {
      ...match,
      round: match.round + 1,
      hasDiscardedCardThisRound: false,
      actionPoints: actionPointsFor(match.activeInvestigatorId),
      preparedCardInstanceId: null,
      decks: Object.fromEntries(
        Object.entries(match.decks).map(([investigatorId, deck]) => [
          investigatorId,
          drawToHand(deck, INITIAL_HAND_SIZE),
        ]),
      ) as SoloMatch['decks'],
    }
    this.repository.save(updated)
    return updated
  }
}
