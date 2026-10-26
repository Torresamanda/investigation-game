import { canPayAction, spendActionPoints } from '../../../shared/domain/action-points.js'
import type { CreateJournalConnectionCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import { assertMatchIsActive, DomainError, MatchNotFoundError } from '../../domain/errors.js'
import { recycleCardFromHand } from '../../domain/match-deck.js'
import type { SoloMatch } from '../../domain/match.js'
import { findCoherentConnection } from '../../domain/coherent-connection.js'
import { synchronizeInvestigationHypotheses } from '../../domain/investigation-hypothesis.js'

const connectionCards = new Set(['route-map', 'comparative-magnifier', 'cross-reference'])

export class CreateJournalConnectionUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly createId: () => string,
  ) {}

  execute(command: CreateJournalConnectionCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    assertMatchIsActive(match.status)
    if (command.fromClueId === command.toClueId) {
      throw new DomainError('Escolha duas pistas diferentes para criar a conexão.')
    }

    const fromClue = match.journalEntries.find(
      (entry) =>
        entry.id === command.fromClueId && entry.type === 'clue' && entry.status === 'confirmed',
    )
    const toClue = match.journalEntries.find(
      (entry) =>
        entry.id === command.toClueId && entry.type === 'clue' && entry.status === 'confirmed',
    )
    if (!fromClue || !toClue) {
      throw new DomainError('As duas conexões precisam ser evidências confirmadas do diário.')
    }
    const coherentConnection = findCoherentConnection(fromClue, toClue)
    if (!coherentConnection) {
      throw new DomainError('Essas evidências não formam uma conexão coerente.')
    }

    const pair = [command.fromClueId, command.toClueId].sort()
    const alreadyConnected = match.journalConnections.some(
      (connection) =>
        [connection.fromClueId, connection.toClueId].sort().join(':') === pair.join(':'),
    )
    if (alreadyConnected) throw new DomainError('Essas pistas já têm uma conexão formal.')

    const activeDeck = match.decks[match.activeInvestigatorId]
    const preparedCard = match.preparedCardInstanceId
      ? activeDeck.hand.find((card) => card.instanceId === match.preparedCardInstanceId)
      : undefined
    const usesConnectionCard = Boolean(
      preparedCard && connectionCards.has(preparedCard.definitionId) && !preparedCard.temporary,
    )
    const usesRoundFreeConnection =
      match.hasFreeConnectionThisRound && !match.hasUsedFreeConnectionThisRound
    const isFree = usesConnectionCard || usesRoundFreeConnection
    if (
      !isFree &&
      !canPayAction(match.actionPoints, {
        action: 'research',
        amount: 1,
      })
    ) {
      throw new DomainError('É preciso ter 1 PA geral ou de pesquisa para criar a conexão.')
    }

    const actionPoints = isFree
      ? match.actionPoints
      : spendActionPoints(match.actionPoints, {
          action: 'research',
          amount: 1,
        })
    let decks = match.decks
    if (usesConnectionCard && preparedCard) {
      const recycled = recycleCardFromHand(
        activeDeck,
        match.decks[preparedCard.ownerId],
        preparedCard.instanceId,
      )
      decks = {
        ...match.decks,
        [match.activeInvestigatorId]: recycled.holderDeck,
        [preparedCard.ownerId]: recycled.ownerDeck,
      }
    }
    const connection = {
      id: this.createId(),
      fromClueId: command.fromClueId,
      toClueId: command.toClueId,
      round: match.round,
      hypothesisThreadId: coherentConnection.hypothesisThreadId,
    }
    const updated: SoloMatch = {
      ...match,
      actionPoints,
      decks,
      preparedCardInstanceId: usesConnectionCard ? null : match.preparedCardInstanceId,
      hasUsedFreeConnectionThisRound:
        match.hasUsedFreeConnectionThisRound || (usesRoundFreeConnection && !usesConnectionCard),
      journalConnections: [...match.journalConnections, connection],
      hypotheses: synchronizeInvestigationHypotheses(
        match.journalEntries,
        [...match.journalConnections, connection],
        match.hypotheses ?? [],
      ),
    }
    return this.repository.save(updated)
  }
}
