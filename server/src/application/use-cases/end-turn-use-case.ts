import type { MatchRepository } from '../ports/match-repository.js'
import { actionPointsFor, type SoloMatch } from '../../domain/match.js'
import { INITIAL_HAND_SIZE, refreshHandForTurn } from '../../domain/match-deck.js'
import { DomainError, MatchNotFoundError } from '../../domain/errors.js'

export class EndTurnUseCase {
  constructor(private readonly repository: MatchRepository) {}

  execute(matchId: string): SoloMatch {
    const match = this.repository.findById(matchId)
    if (!match) throw new MatchNotFoundError()
    if (match.status !== 'active') throw new DomainError('A partida já foi encerrada.')
    if (match.round === 6) {
      const finished: SoloMatch = {
        ...match,
        status: 'lost',
        canAccuse: false,
        preparedCardInstanceId: null,
      }
      this.repository.save(finished)
      return finished
    }

    const nextRound = match.round + 1
    const nextJournalEntries =
      nextRound === 3
        ? [
            ...match.journalEntries,
            {
              id: `journal-${match.journalEntries.length + 1}`,
              type: 'observation' as const,
              title: 'Comunicado da manutenção municipal',
              content:
                'A verificação externa confirma que a rede municipal permaneceu ativa; a interrupção começou dentro do prédio.',
              locationId: 'security' as const,
              round: nextRound,
              status: 'note' as const,
            },
          ]
        : match.journalEntries
    const updated: SoloMatch = {
      ...match,
      round: nextRound,
      examinedLocationsThisRound: [],
      hasUsedPassiveThisRound: false,
      hasReceivedSocialBonusThisRound: false,
      hasUsedPressLeakConversationThisRound: false,
      canAccuse: match.canAccuse || nextRound >= 5,
      hasFreeConnectionThisRound: nextRound === 5,
      hasUsedFreeConnectionThisRound: false,
      hasUsedFreeMoveThisRound: false,
      hasDiscardedCardThisRound: false,
      actionPoints: actionPointsFor(match.activeInvestigatorId),
      preparedCardInstanceId: null,
      journalEntries: nextJournalEntries,
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
