import { randomUUID } from 'node:crypto'
import { canPayAction, spendActionPoints } from '../../../shared/domain/action-points.js'
import { locationIds, type PersonId } from '../../../shared/domain/identifiers.js'
import type { InvestigationAction as SharedInvestigationAction } from '../../../shared/domain/identifiers.js'
import {
  createSoloMatch,
  investigatorIds,
  actionPointsFor,
  type InvestigationAction,
  type InvestigatorId,
  type JournalEntry,
  type LocationId,
  type SoloMatch,
} from '../domain/match.js'
import {
  addTemporaryCardToHand,
  discardFromHand,
  drawToHand,
  INITIAL_HAND_SIZE,
} from '../domain/match-deck.js'
import {
  getConversation,
  isPersonAvailableAtLocation,
  getConversationReward,
  resolveConversationOutcome,
  type ConversationQuestion,
} from '../content/case01-conversations.js'

export interface CreateMatchCommand {
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
}

export interface ResolveActionCommand {
  readonly matchId: string
  readonly action: Exclude<SharedInvestigationAction, 'move' | 'card'>
  readonly locationId: LocationId
}

export interface ResolveConversationCommand {
  readonly matchId: string
  readonly personId: PersonId
  readonly locationId: LocationId
  readonly questionId: string
}

export interface ConversationOptions {
  readonly personId: PersonId
  readonly personName: string
  readonly locationId: LocationId
  readonly questionLimitReached: boolean
  readonly questions: readonly (Omit<ConversationQuestion, 'cost' | 'result'> & {
    readonly cost: 0 | 1 | 2
    readonly canResolve: boolean
  })[]
}

export interface MatchRepository {
  save(match: SoloMatch): void
  findById(id: string): SoloMatch | undefined
}

export class InMemoryMatchRepository implements MatchRepository {
  private readonly matches = new Map<string, SoloMatch>()

  save(match: SoloMatch) {
    this.matches.set(match.id, match)
  }

  findById(id: string) {
    return this.matches.get(id)
  }
}

export class MatchService {
  constructor(
    private readonly repository: MatchRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  createSoloMatch(command: CreateMatchCommand): SoloMatch {
    const match = createSoloMatch({
      id: this.createId(),
      activeInvestigatorId: command.activeInvestigatorId,
      supportInvestigatorId: command.supportInvestigatorId,
      createdAt: this.now().toISOString(),
    })
    this.repository.save(match)
    return match
  }

  getMatch(id: string): SoloMatch | undefined {
    return this.repository.findById(id)
  }

  getConversationOptions(
    matchId: string,
    personId: PersonId,
    locationId: LocationId,
  ): ConversationOptions {
    const match = this.getMatch(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    this.assertPersonAvailability(personId, locationId)
    const conversation = getConversation(personId)
    const questionLimitReached = match.resolvedKeys.includes(conversationTurnKey(match, personId))
    const bonusQuestion = hasConversationBonus(match, personId)
    return {
      personId,
      personName: conversation.personName,
      locationId,
      questionLimitReached: questionLimitReached && !bonusQuestion,
      questions: conversation.questions
        .filter((question) => !match.resolvedKeys.includes(conversationKey(personId, question.id)))
        .map(({ id, text, cost, approach }) => ({
          id,
          text,
          cost: bonusQuestion ? 0 : cost,
          approach,
          canResolve:
            (!questionLimitReached || bonusQuestion) &&
            canPayAction(match.actionPoints, {
              action: 'converse',
              amount: bonusQuestion ? 0 : cost,
            }),
        })),
    }
  }

  resolveConversation(command: ResolveConversationCommand): SoloMatch {
    const match = this.getMatch(command.matchId)
    if (!match) throw new Error('Partida não encontrada.')
    this.assertPersonAvailability(command.personId, command.locationId)
    const conversation = getConversation(command.personId)
    const question = conversation.questions.find((item) => item.id === command.questionId)
    if (!question) throw new Error('Pergunta inexistente para esta conversa.')
    const resolvedKey = conversationKey(command.personId, question.id)
    if (match.resolvedKeys.includes(resolvedKey)) throw new Error('Esta pergunta já foi resolvida.')
    const bonusQuestion = hasConversationBonus(match, command.personId)
    if (
      match.resolvedKeys.includes(conversationTurnKey(match, command.personId)) &&
      !bonusQuestion
    ) {
      throw new Error('Você já fez uma pergunta neste turno.')
    }
    const activeDeck = match.decks[match.activeInvestigatorId]
    const card = match.preparedCardInstanceId
      ? activeDeck.hand.find((item) => item.instanceId === match.preparedCardInstanceId)
      : undefined
    if (match.preparedCardInstanceId && (!card || !card.compatibleActions.includes('converse'))) {
      throw new Error('A carta não pode ser usada nesta conversa.')
    }
    const questionCost = bonusQuestion ? 0 : question.cost
    const totalCost = questionCost + (card?.cost ?? 0)
    if (!canPayAction(match.actionPoints, { action: 'converse', amount: totalCost })) {
      throw new Error('PA insuficientes para esta pergunta.')
    }
    const outcome = resolveConversationOutcome(command.personId, command.questionId, match)
    if (!outcome) throw new Error('Não foi possível resolver esta pergunta.')

    const reward = getConversationReward(command.personId, command.questionId, match.round)
    const usesCalculatedPause = card?.definitionId === 'calculated-pause'
    const updated: SoloMatch = {
      ...match,
      actionPoints: spendActionPoints(match.actionPoints, {
        action: 'converse',
        amount: totalCost,
      }),
      decks: card
        ? {
            ...match.decks,
            [match.activeInvestigatorId]: reward
              ? addTemporaryCardToHand(
                  discardFromHand(activeDeck, card.instanceId),
                  reward,
                  match.activeInvestigatorId,
                )
              : discardFromHand(activeDeck, card.instanceId),
          }
        : reward
          ? {
              ...match.decks,
              [match.activeInvestigatorId]: addTemporaryCardToHand(
                activeDeck,
                reward,
                match.activeInvestigatorId,
              ),
            }
          : match.decks,
      preparedCardInstanceId: null,
      journalEntries: [
        ...match.journalEntries,
        {
          id: thisEntryId(match),
          type: 'statement',
          title: `Declaração de ${conversation.personName}`,
          content: outcome.content,
          locationId: command.locationId,
          round: match.round,
          status: outcome.status,
          recordedWith: card?.definitionId === 'pocket-recorder' ? 'pocket-recorder' : undefined,
        },
      ],
      resolvedKeys: [
        ...match.resolvedKeys,
        resolvedKey,
        conversationTurnKey(match, command.personId),
        ...(bonusQuestion ? [conversationBonusUsedKey(match, command.personId)] : []),
        ...(usesCalculatedPause ? [conversationBonusKey(match, command.personId)] : []),
      ],
    }
    this.repository.save(updated)
    return updated
  }

  resolveAction(command: ResolveActionCommand): SoloMatch {
    const match = this.getMatch(command.matchId)
    if (!match) throw new Error('Partida não encontrada.')
    const activeDeck = match.decks[match.activeInvestigatorId]
    const card = match.preparedCardInstanceId
      ? activeDeck.hand.find((item) => item.instanceId === match.preparedCardInstanceId)
      : undefined
    if (
      match.preparedCardInstanceId &&
      (!card || !card.compatibleActions.includes(command.action))
    ) {
      throw new Error('A carta não pode ser usada nesta ação.')
    }
    const cost = 2 + (card?.cost ?? 0)
    if (!canPayAction(match.actionPoints, { action: command.action, amount: cost }))
      throw new Error('PA insuficientes para esta ação.')

    const resolution = resolveCaseAction(match, command.action, command.locationId)
    const updated = {
      ...match,
      actionPoints: spendActionPoints(match.actionPoints, {
        action: command.action,
        amount: cost,
      }),
      decks: card
        ? {
            ...match.decks,
            [match.activeInvestigatorId]: discardFromHand(activeDeck, card.instanceId),
          }
        : match.decks,
      preparedCardInstanceId: null,
      journalEntries: [...match.journalEntries, resolution.entry],
      resolvedKeys: resolution.resolvedKey
        ? [...match.resolvedKeys, resolution.resolvedKey]
        : match.resolvedKeys,
    }
    this.repository.save(updated)
    return updated
  }

  endTurn(matchId: string): SoloMatch {
    const match = this.getMatch(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    if (match.round >= 6) throw new Error('A missão já alcançou o limite de rodadas.')

    const updated = {
      ...match,
      round: match.round + 1,
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

  prepareCard(matchId: string, instanceId: string | null): SoloMatch {
    const match = this.getMatch(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    if (
      instanceId &&
      !match.decks[match.activeInvestigatorId].hand.some((card) => card.instanceId === instanceId)
    ) {
      throw new Error('A carta precisa estar na mão do investigador.')
    }
    const updated = { ...match, preparedCardInstanceId: instanceId }
    this.repository.save(updated)
    return updated
  }

  private assertPersonAvailability(personId: PersonId, locationId: LocationId) {
    if (!isPersonAvailableAtLocation(personId, locationId)) {
      throw new Error('Esta pessoa não está disponível neste local.')
    }
  }
}

export function isInvestigatorId(value: unknown): value is InvestigatorId {
  return typeof value === 'string' && investigatorIds.includes(value as InvestigatorId)
}

export function isLocationId(value: unknown): value is LocationId {
  return typeof value === 'string' && locationIds.includes(value as LocationId)
}

export function isInvestigationAction(
  value: unknown,
): value is Exclude<SharedInvestigationAction, 'move' | 'card'> {
  return typeof value === 'string' && ['examine', 'converse', 'analyse', 'research'].includes(value)
}

function resolveCaseAction(
  match: SoloMatch,
  action: InvestigationAction,
  locationId: LocationId,
): { entry: JournalEntry; resolvedKey?: string } {
  const entryId = thisEntryId(match)
  if (match.round === 1 && locationId === 'gallery' && action === 'examine') {
    if (!match.resolvedKeys.includes('gallery-lock')) {
      return {
        resolvedKey: 'gallery-lock',
        entry: {
          id: entryId,
          type: 'clue',
          title: 'Fechadura de emergência',
          content:
            'A fechadura interna não tem dano. A vitrine foi aberta com uma chave de emergência.',
          locationId,
          round: match.round,
          status: 'unconfirmed',
        },
      }
    }
    if (!match.resolvedKeys.includes('gallery-pedestal')) {
      return {
        resolvedKey: 'gallery-pedestal',
        entry: {
          id: entryId,
          type: 'clue',
          title: 'Vestígio no pedestal',
          content:
            'Resíduo escuro de óleo e pó fino segue em direção a uma porta de serviço lacrada.',
          locationId,
          round: match.round,
          status: 'unconfirmed',
        },
      }
    }
  }

  return {
    entry: {
      id: entryId,
      type: 'observation',
      title: 'Nenhuma descoberta nova',
      content:
        'Esta abordagem não revelou informação nova neste contexto. Tente outro local ou uma nova ação.',
      locationId,
      round: match.round,
      status: 'note',
    },
  }
}

function thisEntryId(match: SoloMatch): string {
  return `journal-${match.journalEntries.length + 1}`
}

function conversationKey(personId: PersonId, questionId: string) {
  return `conversation:${personId}:${questionId}`
}

function conversationTurnKey(match: SoloMatch, personId: PersonId) {
  return `conversation-turn:${match.round}:${match.activeInvestigatorId}:${personId}`
}

function conversationBonusKey(match: SoloMatch, personId: PersonId) {
  return `conversation-bonus:${match.round}:${match.activeInvestigatorId}:${personId}`
}

function conversationBonusUsedKey(match: SoloMatch, personId: PersonId) {
  return `conversation-bonus-used:${match.round}:${match.activeInvestigatorId}:${personId}`
}

function hasConversationBonus(match: SoloMatch, personId: PersonId) {
  return (
    match.resolvedKeys.includes(conversationBonusKey(match, personId)) &&
    !match.resolvedKeys.includes(conversationBonusUsedKey(match, personId))
  )
}
