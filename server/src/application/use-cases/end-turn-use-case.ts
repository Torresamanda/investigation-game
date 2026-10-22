import type { MatchRepository } from '../ports/match-repository.js'
import { actionPointsFor, type SoloMatch } from '../../domain/match.js'
import { INITIAL_HAND_SIZE, refreshHandForTurn } from '../../domain/match-deck.js'
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
      examinedLocationsThisRound: [],
      hasUsedPassiveThisRound: false,
      hasReceivedSocialBonusThisRound: false,
      hasUsedFreeMoveThisRound: false,
      hasDiscardedCardThisRound: false,
      actionPoints: actionPointsFor(match.activeInvestigatorId),
      preparedCardInstanceId: null,
      decks: Object.fromEntries(
        Object.entries(match.decks).map(([investigatorId, deck]) => [
          investigatorId,
          investigatorId === match.activeInvestigatorId
            ? refreshHandForTurn(deck, INITIAL_HAND_SIZE)
            : deck,
        ]),
      ) as SoloMatch['decks'],
    }
    this.repository.save(updated)
    return updated
  }
}
