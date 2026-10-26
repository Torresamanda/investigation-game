import { canPayAction, spendActionPoints } from '../../../shared/domain/action-points.js'
import type { ResolveConversationCommand } from '../commands.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import type { MatchRepository } from '../ports/match-repository.js'
import { addTemporaryCardToHand, recycleCardFromHand } from '../../domain/match-deck.js'
import type { SoloMatch } from '../../domain/match.js'
import {
  assertMatchIsActive,
  DomainError,
  InvalidActionError,
  MatchNotFoundError,
} from '../../domain/errors.js'
import {
  isPressLeakConversation,
  pressLeakConversationSurcharge,
} from '../../domain/round-event.js'

export class ResolveConversationUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  execute(command: ResolveConversationCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    assertMatchIsActive(match.status)
    if (command.locationId !== match.currentLocationId) {
      throw new DomainError('O investigador precisa estar no local escolhido para agir.')
    }
    if (!match.unlockedLocations.includes(command.locationId)) {
      throw new DomainError('Este local ainda não foi liberado.')
    }
    this.assertPersonAvailability(command.personId, command.locationId)
    const conversation = this.caseContentRepository.getConversation(command.personId)
    const question = conversation.questions.find((item) => item.id === command.questionId)
    if (!question) throw new Error('Pergunta inexistente para esta conversa.')
    const blockedReason = this.caseContentRepository.getConversationBlockReason(
      command.personId,
      command.questionId,
      match,
    )
    if (blockedReason) {
      throw new DomainError('Diálogo bloqueado: evidência necessária')
    }
    const resolvedKey = conversationKey(command.personId, question.id)
    if (match.resolvedKeys.includes(resolvedKey)) throw new Error('Esta pergunta já foi resolvida.')
    const activeDeck = match.decks[match.activeInvestigatorId]
    const card = match.preparedCardInstanceId
      ? activeDeck.hand.find((item) => item.instanceId === match.preparedCardInstanceId)
      : undefined
    if (match.preparedCardInstanceId && (!card || !card.compatibleActions.includes('converse'))) {
      throw new InvalidActionError('A carta não pode ser usada nesta conversa.')
    }
    const hasAskedQuestionThisTurn = match.resolvedKeys.includes(
      conversationTurnKey(match, command.personId),
    )
    const bonusQuestion = hasConversationBonus(match, command.personId)
    const usesPreparedPause = hasAskedQuestionThisTurn && card?.definitionId === 'calculated-pause'
    const questionCost = bonusQuestion || usesPreparedPause ? 0 : question.cost
    const pressLeakSurcharge = pressLeakConversationSurcharge(
      match,
      command.personId,
      Boolean(card?.compatibleActions.includes('converse')),
    )
    const totalCost = questionCost + pressLeakSurcharge + (card?.cost ?? 0)
    if (
      !canPayAction(match.actionPoints, {
        action: 'converse',
        amount: totalCost,
      })
    ) {
      throw new DomainError('PA insuficientes para esta pergunta.')
    }
    const outcome = this.caseContentRepository.resolveConversationOutcome(
      command.personId,
      command.questionId,
      match,
    )
    if (!outcome) throw new Error('Não foi possível resolver esta pergunta.')

    const reward = this.caseContentRepository.getConversationReward(
      command.personId,
      command.questionId,
    )
    const usesCalculatedPause = card?.definitionId === 'calculated-pause'
    const usesIsadoraPassive =
      match.activeInvestigatorId === 'isadora' &&
      !match.hasUsedPassiveThisRound &&
      outcome.status === 'recorded'
    const statementStatus = usesIsadoraPassive ? 'contestable' : outcome.status
    const updated: SoloMatch = {
      ...match,
      actionPoints: spendActionPoints(match.actionPoints, {
        action: 'converse',
        amount: totalCost,
      }),
      decks: resolveConversationDecks(match, activeDeck, card, reward),
      preparedCardInstanceId: null,
      journalEntries: [
        ...match.journalEntries,
        {
          id: `journal-${match.journalEntries.length + 1}`,
          type: 'statement',
          title: `Declaração de ${conversation.personName}`,
          content: usesIsadoraPassive
            ? `${outcome.content} Isadora anotou a declaração para confronto com evidências.`
            : outcome.content,
          locationId: command.locationId,
          round: match.round,
          status: statementStatus,
          recordedWith: card?.definitionId === 'pocket-recorder' ? 'pocket-recorder' : undefined,
          isadoraMarkedContestable: usesIsadoraPassive || undefined,
        },
      ],
      hasUsedPassiveThisRound: match.hasUsedPassiveThisRound || usesIsadoraPassive,
      hasSocialConnectionThisRound: match.hasSocialConnectionThisRound || usesIsadoraPassive,
      hasUsedPressLeakConversationThisRound:
        match.hasUsedPressLeakConversationThisRound ||
        isPressLeakConversation(match, command.personId),
      resolvedKeys: [
        ...match.resolvedKeys,
        resolvedKey,
        conversationTurnKey(match, command.personId),
        ...(bonusQuestion || usesPreparedPause
          ? [conversationBonusUsedKey(match, command.personId)]
          : []),
        ...(usesCalculatedPause && !hasAskedQuestionThisTurn
          ? [conversationBonusKey(match, command.personId)]
          : []),
      ],
    }
    return this.repository.save(updated)
  }

  private assertPersonAvailability(
    personId: ResolveConversationCommand['personId'],
    locationId: ResolveConversationCommand['locationId'],
  ) {
    if (!this.caseContentRepository.isPersonAvailableAtLocation(personId, locationId)) {
      throw new DomainError('Esta pessoa não está disponível neste local.')
    }
  }
}

function resolveConversationDecks(
  match: SoloMatch,
  activeDeck: SoloMatch['decks'][SoloMatch['activeInvestigatorId']],
  card: (typeof activeDeck.hand)[number] | undefined,
  reward: ReturnType<CaseContentRepository['getConversationReward']>,
): SoloMatch['decks'] {
  let decks = match.decks
  if (card) {
    const recycled = recycleCardFromHand(activeDeck, match.decks[card.ownerId], card.instanceId)
    decks = {
      ...decks,
      [match.activeInvestigatorId]: recycled.holderDeck,
      [card.ownerId]: recycled.ownerDeck,
    }
  }
  if (!reward) return decks
  const recipientDeck = decks[match.activeInvestigatorId]
  return {
    ...decks,
    [match.activeInvestigatorId]: addTemporaryCardToHand(
      recipientDeck,
      reward,
      match.activeInvestigatorId,
    ),
  }
}

function conversationKey(personId: string, questionId: string): string {
  return `conversation:${personId}:${questionId}`
}

function conversationTurnKey(match: SoloMatch, personId: string): string {
  return `conversation-turn:${match.round}:${match.activeInvestigatorId}:${personId}`
}

function conversationBonusKey(match: SoloMatch, personId: string): string {
  return `conversation-bonus:${match.round}:${match.activeInvestigatorId}:${personId}`
}

function conversationBonusUsedKey(match: SoloMatch, personId: string): string {
  return `conversation-bonus-used:${match.round}:${match.activeInvestigatorId}:${personId}`
}

function hasConversationBonus(match: SoloMatch, personId: string): boolean {
  return (
    match.resolvedKeys.includes(conversationBonusKey(match, personId)) &&
    !match.resolvedKeys.includes(conversationBonusUsedKey(match, personId))
  )
}
