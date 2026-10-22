import { canPayAction, spendActionPoints } from '../../../../shared/domain/action-points.js'
import type { ResolveConversationCommand } from '../commands.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import type { MatchRepository } from '../ports/match-repository.js'
import { addTemporaryCardToDrawPile, discardFromHand } from '../../domain/match-deck.js'
import type { SoloMatch } from '../../domain/match.js'
import { DomainError, InvalidActionError, MatchNotFoundError } from '../../domain/errors.js'

export class ResolveConversationUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  execute(command: ResolveConversationCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
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
      throw new DomainError('Diálogo bloqueado: necessário evidência')
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
    const questionLimitReached = match.resolvedKeys.includes(
      conversationTurnKey(match, command.personId),
    )
    const bonusQuestion = hasConversationBonus(match, command.personId)
    const usesPreparedPause = questionLimitReached && card?.definitionId === 'calculated-pause'
    if (questionLimitReached && !bonusQuestion && !usesPreparedPause) {
      throw new Error('Você já fez uma pergunta neste turno.')
    }
    const questionCost = bonusQuestion || usesPreparedPause ? 0 : question.cost
    const totalCost = questionCost + (card?.cost ?? 0)
    if (!canPayAction(match.actionPoints, { action: 'converse', amount: totalCost })) {
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
      match.round,
    )
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
              ? addTemporaryCardToDrawPile(
                  discardFromHand(activeDeck, card.instanceId),
                  reward,
                  match.activeInvestigatorId,
                )
              : discardFromHand(activeDeck, card.instanceId),
          }
        : reward
          ? {
              ...match.decks,
              [match.activeInvestigatorId]: addTemporaryCardToDrawPile(
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
          id: `journal-${match.journalEntries.length + 1}`,
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
        ...(bonusQuestion || usesPreparedPause
          ? [conversationBonusUsedKey(match, command.personId)]
          : []),
        ...(usesCalculatedPause && !questionLimitReached
          ? [conversationBonusKey(match, command.personId)]
          : []),
      ],
    }
    this.repository.save(updated)
    return updated
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
