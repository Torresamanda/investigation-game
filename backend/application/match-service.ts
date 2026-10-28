import { calculateEffectiveActionCost, canPayAction } from '../../shared/domain/action-points.js'
import { locationIds, type InvestigatorId, type PersonId } from '../../shared/domain/identifiers.js'
import type { InvestigationAction as SharedInvestigationAction } from '../../shared/domain/identifiers.js'
import { investigatorIds, type LocationId, type SoloMatch } from '../domain/match.js'
import type {
  CaseContentRepository,
  ConversationQuestionContent,
} from './ports/case-content-repository.js'
import type { MatchRepository } from './ports/match-repository.js'
import { NotificationRecordingMatchRepository } from './notification-recording-match-repository.js'
import { Case01ContentRepository } from '../infrastructure/content/case01-content-repository.js'
import {
  type CreateMatchCommand,
  type ResolveActionCommand,
  type ResolveConversationCommand,
  type CreateMuralLinkCommand,
  type CreateInvestigativeCrossingCommand,
  type PrepareOperationCommand,
  type ResolveOperationCommand,
} from './commands.js'
import { CreateSoloMatchUseCase } from './use-cases/create-solo-match-use-case.js'
import { DiscardCardUseCase } from './use-cases/discard-card-use-case.js'
import { EndTurnUseCase } from './use-cases/end-turn-use-case.js'
import { GetMatchUseCase } from './use-cases/get-match-use-case.js'
import { PrepareCardUseCase } from './use-cases/prepare-card-use-case.js'
import { ResolveActionUseCase } from './use-cases/resolve-action-use-case.js'
import { ResolveConversationUseCase } from './use-cases/resolve-conversation-use-case.js'
import { MoveInvestigatorUseCase } from './use-cases/move-investigator-use-case.js'
import { CreateMuralLinkUseCase } from './use-cases/create-mural-link-use-case.js'
import { CreateInvestigativeCrossingUseCase } from './use-cases/create-investigative-crossing-use-case.js'
import { RequestSupportCardUseCase } from './use-cases/request-support-card-use-case.js'
import { PrepareOperationUseCase } from './use-cases/prepare-operation-use-case.js'
import { ResolveOperationUseCase } from './use-cases/resolve-operation-use-case.js'
import { CancelOperationUseCase } from './use-cases/cancel-operation-use-case.js'
import { pressLeakConversationSurcharge } from '../domain/round-event.js'
import { DomainError } from '../domain/errors.js'
import type { OperationOption } from '../domain/investigation-operation.js'
import type { RandomGenerator } from './ports/random-generator.js'
import { WebCryptoRandomGenerator } from '../infrastructure/crypto/web-crypto-random-generator.js'
import type { InvestigationOpportunity } from '../../shared/contracts/investigation-opportunity.js'
import { GetActionOpportunitiesUseCase } from './use-cases/get-action-opportunities-use-case.js'
import { GetAvailableOperationsUseCase } from './use-cases/get-available-operations-use-case.js'

export type {
  CreateInvestigativeCrossingCommand,
  CreateMatchCommand,
  CreateMuralLinkCommand,
  ResolveActionCommand,
  ResolveConversationCommand,
}

export interface ConversationOptions {
  readonly personId: PersonId
  readonly personName: string
  readonly locationId: LocationId
  readonly opportunity: InvestigationOpportunity
  readonly questions: readonly (Omit<ConversationQuestionContent, 'cost'> & {
    readonly cost: number
    readonly canResolve: boolean
    readonly isEvidenceBlocked: boolean
  })[]
}

export class MatchService {
  private readonly createSoloMatchUseCase: CreateSoloMatchUseCase
  private readonly discardCardUseCase: DiscardCardUseCase
  private readonly endTurnUseCase: EndTurnUseCase
  private readonly getMatchUseCase: GetMatchUseCase
  private readonly prepareCardUseCase: PrepareCardUseCase
  private readonly resolveActionUseCase: ResolveActionUseCase
  private readonly resolveConversationUseCase: ResolveConversationUseCase
  private readonly moveInvestigatorUseCase: MoveInvestigatorUseCase
  private readonly createMuralLinkUseCase: CreateMuralLinkUseCase
  private readonly createInvestigativeCrossingUseCase: CreateInvestigativeCrossingUseCase
  private readonly requestSupportCardUseCase: RequestSupportCardUseCase
  private readonly prepareOperationUseCase: PrepareOperationUseCase
  private readonly resolveOperationUseCase: ResolveOperationUseCase
  private readonly cancelOperationUseCase: CancelOperationUseCase
  private readonly getActionOpportunitiesUseCase: GetActionOpportunitiesUseCase
  private readonly getAvailableOperationsUseCase: GetAvailableOperationsUseCase

  constructor(
    repository: MatchRepository,
    now: () => Date = () => new Date(),
    createId: () => string = () => globalThis.crypto.randomUUID(),
    private readonly caseContentRepository: CaseContentRepository = new Case01ContentRepository(),
    private readonly randomGenerator: RandomGenerator = new WebCryptoRandomGenerator(),
  ) {
    const notificationRepository = new NotificationRecordingMatchRepository(
      repository,
      caseContentRepository,
    )
    this.createSoloMatchUseCase = new CreateSoloMatchUseCase(
      notificationRepository,
      now,
      createId,
      randomGenerator,
    )
    this.discardCardUseCase = new DiscardCardUseCase(notificationRepository, randomGenerator)
    this.endTurnUseCase = new EndTurnUseCase(notificationRepository, randomGenerator)
    this.getMatchUseCase = new GetMatchUseCase(notificationRepository)
    this.prepareCardUseCase = new PrepareCardUseCase(notificationRepository)
    this.resolveActionUseCase = new ResolveActionUseCase(
      notificationRepository,
      caseContentRepository,
    )
    this.resolveConversationUseCase = new ResolveConversationUseCase(
      notificationRepository,
      caseContentRepository,
    )
    this.moveInvestigatorUseCase = new MoveInvestigatorUseCase(notificationRepository)
    this.createMuralLinkUseCase = new CreateMuralLinkUseCase(notificationRepository, createId)
    this.createInvestigativeCrossingUseCase = new CreateInvestigativeCrossingUseCase(
      notificationRepository,
      createId,
    )
    this.requestSupportCardUseCase = new RequestSupportCardUseCase(
      notificationRepository,
      randomGenerator,
    )
    this.prepareOperationUseCase = new PrepareOperationUseCase(
      notificationRepository,
      caseContentRepository,
    )
    this.resolveOperationUseCase = new ResolveOperationUseCase(
      notificationRepository,
      caseContentRepository,
    )
    this.cancelOperationUseCase = new CancelOperationUseCase(notificationRepository)
    this.getActionOpportunitiesUseCase = new GetActionOpportunitiesUseCase(
      notificationRepository,
      caseContentRepository,
    )
    this.getAvailableOperationsUseCase = new GetAvailableOperationsUseCase(
      notificationRepository,
      caseContentRepository,
    )
  }

  createSoloMatch(command: CreateMatchCommand): SoloMatch {
    return this.createSoloMatchUseCase.execute(command)
  }

  getMatch(id: string): SoloMatch | undefined {
    return this.getMatchUseCase.execute(id)
  }

  getConversationOptions(
    matchId: string,
    personId: PersonId,
    locationId: LocationId,
  ): ConversationOptions {
    const match = this.getMatch(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    assertCurrentLocation(match, locationId)
    this.assertPersonAvailability(personId, locationId)
    const conversation = this.caseContentRepository.getConversation(personId)
    const hasAskedQuestionThisTurn = match.resolvedKeys.includes(
      conversationTurnKey(match, personId),
    )
    const preparedCard = match.preparedCardInstanceId
      ? match.decks[match.activeInvestigatorId].hand.find(
          (card) => card.instanceId === match.preparedCardInstanceId,
        )
      : undefined
    const bonusQuestion =
      hasConversationBonus(match, personId) ||
      (hasAskedQuestionThisTurn && preparedCard?.definitionId === 'calculated-pause')
    const questions = conversation.questions
      .filter((question) => !match.resolvedKeys.includes(conversationKey(personId, question.id)))
      .map(({ id, text, cost, approach }) => {
        const blockedReason = this.caseContentRepository.getConversationBlockReason(
          personId,
          id,
          match,
        )
        const pressLeakSurcharge = pressLeakConversationSurcharge(
          match,
          personId,
          Boolean(preparedCard?.compatibleActions.includes('converse')),
        )
        const totalCost = calculateEffectiveActionCost({
          baseCost: bonusQuestion ? 0 : cost,
          preparedCardCost: preparedCard?.cost,
          surcharge: pressLeakSurcharge,
          minimumCost: bonusQuestion ? 0 : 1,
        })
        return {
          id,
          text,
          cost: totalCost,
          approach,
          isEvidenceBlocked: Boolean(blockedReason),
          canResolve:
            !blockedReason &&
            canPayAction(match.actionPoints, {
              action: 'converse',
              amount: totalCost,
            }),
        }
      })
    const availableQuestions = questions.filter((question) => !question.isEvidenceBlocked)
    const opportunity: InvestigationOpportunity = !questions.length
      ? {
          status: 'exhausted',
          message:
            'Os assuntos já tratados não trouxeram novos elementos. Reavalie as anotações antes de retomar a conversa.',
        }
      : availableQuestions.length
        ? {
            status: 'promising',
            message:
              'Esta conversa pode acrescentar contexto, mas nenhuma resposta garante um avanço.',
          }
        : {
            status: 'exploratory',
            message:
              'Os assuntos disponíveis ainda pedem mais contexto. O diálogo pode orientar a busca, sem garantir avanço.',
          }
    return {
      personId,
      personName: conversation.personName,
      locationId,
      opportunity,
      questions,
    }
  }

  getActionOpportunities(matchId: string) {
    return this.getActionOpportunitiesUseCase.execute(matchId)
  }

  resolveConversation(command: ResolveConversationCommand): SoloMatch {
    return this.resolveConversationUseCase.execute(command)
  }

  resolveAction(command: ResolveActionCommand): SoloMatch {
    return this.resolveActionUseCase.execute(command)
  }

  endTurn(matchId: string): SoloMatch {
    return this.endTurnUseCase.execute(matchId)
  }

  requestSupportCard(matchId: string): SoloMatch {
    return this.requestSupportCardUseCase.execute(matchId)
  }

  discardCard(matchId: string, instanceId: string): SoloMatch {
    return this.discardCardUseCase.execute(matchId, instanceId)
  }

  prepareCard(matchId: string, instanceId: string | null): SoloMatch {
    return this.prepareCardUseCase.execute(matchId, instanceId)
  }

  moveInvestigator(matchId: string, locationId: LocationId): SoloMatch {
    return this.moveInvestigatorUseCase.execute(matchId, locationId)
  }

  createMuralLink(command: CreateMuralLinkCommand): SoloMatch {
    return this.createMuralLinkUseCase.execute(command)
  }

  createInvestigativeCrossing(command: CreateInvestigativeCrossingCommand): SoloMatch {
    return this.createInvestigativeCrossingUseCase.execute(command)
  }

  getAvailableOperations(matchId: string): readonly OperationOption[] {
    return this.getAvailableOperationsUseCase.execute(matchId)
  }

  prepareOperation(matchId: string, operationId: string): SoloMatch {
    const match = this.getMatch(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    const operation = this.caseContentRepository
      .getAvailableOperations(match)
      .find((item) => item.id === operationId)
    const hypothesis = match.hypotheses?.find((item) =>
      operation?.kind === 'verify'
        ? item.status === 'plausible' || item.status === 'sustained'
        : item.status === 'sustained',
    )
    if (!hypothesis) throw new DomainError('A linha de raciocínio ainda não permite esta operação.')
    const command: PrepareOperationCommand = { matchId, operationId, hypothesisId: hypothesis.id }
    return this.prepareOperationUseCase.execute(command)
  }

  resolveOperation(matchId: string): SoloMatch {
    const command: ResolveOperationCommand = { matchId }
    return this.resolveOperationUseCase.execute(command)
  }

  cancelOperation(matchId: string): SoloMatch {
    return this.cancelOperationUseCase.execute(matchId)
  }

  private assertPersonAvailability(personId: PersonId, locationId: LocationId) {
    if (!this.caseContentRepository.isPersonAvailableAtLocation(personId, locationId)) {
      throw new Error('Esta pessoa não está disponível neste local.')
    }
  }
}

function assertCurrentLocation(match: SoloMatch, locationId: LocationId): void {
  if (locationId !== match.currentLocationId) {
    throw new DomainError('O investigador precisa estar no local escolhido para agir.')
  }
  if (!match.unlockedLocations.includes(locationId)) {
    throw new DomainError('Este local ainda não foi liberado.')
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
): value is Exclude<SharedInvestigationAction, 'move' | 'card' | 'converse'> {
  return typeof value === 'string' && ['examine', 'analyse', 'research'].includes(value)
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
