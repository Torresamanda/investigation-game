import type { MatchRepository } from '../ports/match-repository.js'
import type { RandomGenerator } from '../ports/random-generator.js'
import { actionPointsFor, type SoloMatch } from '../../domain/match.js'
import { INITIAL_HAND_SIZE, refreshHandForTurn } from '../../domain/match-deck.js'
import { DomainError, MatchNotFoundError } from '../../domain/errors.js'

export class EndTurnUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly randomGenerator: RandomGenerator,
  ) {}

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
        hasUsedSupportThisRound: false,
      }
      return this.repository.save(finished)
    }

    const nextRound = match.round + 1
    const decksToRefresh = match.decks
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
      hasUsedSupportThisRound: false,
      actionPoints: actionPointsFor(match.activeInvestigatorId),
      preparedCardInstanceId: null,
      journalEntries: nextJournalEntries,
      decks: Object.fromEntries(
        Object.entries(decksToRefresh).map(([investigatorId, deck]) => [
          investigatorId,
          investigatorId === match.activeInvestigatorId
            ? refreshHandForTurn(
                deck,
                INITIAL_HAND_SIZE,
                (maxExclusive) => this.randomGenerator.nextInt(maxExclusive),
                match.activeInvestigatorId,
              )
            : deck,
        ]),
      ) as SoloMatch['decks'],
    }
    return this.repository.save(updated)
  }
}
