import { canPayAction } from '../../shared/domain/action-points.js'
import { locationIds, type InvestigatorId, type PersonId } from '../../shared/domain/identifiers.js'
import type { InvestigationAction as SharedInvestigationAction } from '../../shared/domain/identifiers.js'
import { investigatorIds, type LocationId, type SoloMatch } from '../domain/match.js'
import type {
  CaseContentRepository,
  ConversationQuestionContent,
} from './ports/case-content-repository.js'
import type { MatchRepository } from './ports/match-repository.js'
import { Case01ContentRepository } from '../infrastructure/content/case01-content-repository.js'
import {
  type AccuseSuspectCommand,
  type CreateMatchCommand,
  type ResolveActionCommand,
  type ResolveConversationCommand,
  type CreateJournalConnectionCommand,
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
import { CreateJournalConnectionUseCase } from './use-cases/create-journal-connection-use-case.js'
import { AccuseSuspectUseCase } from './use-cases/accuse-suspect-use-case.js'
import { RequestSupportCardUseCase } from './use-cases/request-support-card-use-case.js'
import { PrepareOperationUseCase } from './use-cases/prepare-operation-use-case.js'
import { ResolveOperationUseCase } from './use-cases/resolve-operation-use-case.js'
import type { OperationOption } from '../domain/investigation-operation.js'
import { pressLeakConversationSurcharge } from '../domain/round-event.js'
import { DomainError } from '../domain/errors.js'
import type { RandomGenerator } from './ports/random-generator.js'
import { WebCryptoRandomGenerator } from '../infrastructure/crypto/web-crypto-random-generator.js'

export type { CreateMatchCommand, ResolveActionCommand, ResolveConversationCommand }

export interface ConversationOptions {
  readonly personId: PersonId
  readonly personName: string
  readonly locationId: LocationId
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
  private readonly createJournalConnectionUseCase: CreateJournalConnectionUseCase
  private readonly accuseSuspectUseCase: AccuseSuspectUseCase
  private readonly requestSupportCardUseCase: RequestSupportCardUseCase
  private readonly prepareOperationUseCase: PrepareOperationUseCase
  private readonly resolveOperationUseCase: ResolveOperationUseCase

  constructor(
    private readonly repository: MatchRepository,
    now: () => Date = () => new Date(),
    createId: () => string = () => globalThis.crypto.randomUUID(),
    private readonly caseContentRepository: CaseContentRepository = new Case01ContentRepository(),
    private readonly randomGenerator: RandomGenerator = new WebCryptoRandomGenerator(),
  ) {
    this.createSoloMatchUseCase = new CreateSoloMatchUseCase(
      repository,
      now,
      createId,
      randomGenerator,
    )
    this.discardCardUseCase = new DiscardCardUseCase(repository, randomGenerator)
    this.endTurnUseCase = new EndTurnUseCase(repository, randomGenerator)
    this.getMatchUseCase = new GetMatchUseCase(repository)
    this.prepareCardUseCase = new PrepareCardUseCase(repository)
    this.resolveActionUseCase = new ResolveActionUseCase(repository, caseContentRepository)
    this.resolveConversationUseCase = new ResolveConversationUseCase(
      repository,
      caseContentRepository,
    )
    this.moveInvestigatorUseCase = new MoveInvestigatorUseCase(repository)
    this.createJournalConnectionUseCase = new CreateJournalConnectionUseCase(repository, createId)
    this.accuseSuspectUseCase = new AccuseSuspectUseCase(repository, caseContentRepository)
    this.requestSupportCardUseCase = new RequestSupportCardUseCase(repository, randomGenerator)
    this.prepareOperationUseCase = new PrepareOperationUseCase(repository, operationOptions)
    this.resolveOperationUseCase = new ResolveOperationUseCase(repository)
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
    return {
      personId,
      personName: conversation.personName,
      locationId,
      questions: conversation.questions
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
          const totalCost =
            (bonusQuestion ? 0 : cost) + pressLeakSurcharge + (preparedCard?.cost ?? 0)
          return {
            id,
            text,
            cost: (bonusQuestion ? 0 : cost) + pressLeakSurcharge,
            approach,
            isEvidenceBlocked: Boolean(blockedReason),
            canResolve:
              !blockedReason &&
              canPayAction(match.actionPoints, {
                action: 'converse',
                amount: totalCost,
              }),
          }
        }),
    }
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

  createJournalConnection(command: CreateJournalConnectionCommand): SoloMatch {
    return this.createJournalConnectionUseCase.execute(command)
  }

  accuseSuspect(command: AccuseSuspectCommand): SoloMatch {
    return this.accuseSuspectUseCase.execute(command)
  }

  getAvailableOperations(matchId: string): readonly OperationOption[] {
    const match = this.getMatch(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    return match.hypotheses?.some((hypothesis) => hypothesis.status === 'sustained')
      ? operationOptions
      : []
  }

  prepareOperation(matchId: string, operationId: string): SoloMatch {
    const match = this.getMatch(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    const hypothesis = match.hypotheses?.find((item) => item.status === 'sustained')
    if (!hypothesis) throw new DomainError('A linha de raciocínio ainda não sustenta uma operação.')
    const command: PrepareOperationCommand = { matchId, operationId, hypothesisId: hypothesis.id }
    return this.prepareOperationUseCase.execute(command)
  }

  resolveOperation(matchId: string): SoloMatch {
    const command: ResolveOperationCommand = { matchId }
    return this.resolveOperationUseCase.execute(command)
  }

  private assertPersonAvailability(personId: PersonId, locationId: LocationId) {
    if (!this.caseContentRepository.isPersonAvailableAtLocation(personId, locationId)) {
      throw new Error('Esta pessoa não está disponível neste local.')
    }
  }
}

const operationOptions: readonly OperationOption[] = [
  {
    id: 'preserve-the-evidence',
    title: 'Preservar a prova',
    riskDescription: 'A operação pode revelar uma inconsistência na linha de raciocínio.',
  },
]

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
