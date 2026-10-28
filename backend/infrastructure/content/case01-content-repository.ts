import type {
  CaseContentRepository,
  CaseActionResolution,
} from '../../application/ports/case-content-repository.js'
import {
  getConversation,
  getConversationReward,
  getConversationBlockReason,
  isPersonAvailableAtLocation,
  resolveConversationOutcome,
} from '../../content/case01-conversations.js'
import type {
  InvestigationAction,
  LocationId,
  PersonId,
} from '../../../shared/domain/identifiers.js'
import type { CaseEvidenceKey, SoloMatch } from '../../domain/match.js'
import { resolveCase01CardEffect } from './case01-card-effects.js'
import type { OperationOption } from '../../domain/investigation-operation.js'
import type {
  BasicInvestigationAction,
  InvestigationOpportunity,
} from '../../../shared/contracts/investigation-opportunity.js'
import { case01Content } from '../../content/cases/case01/v1.js'
import { resolveConfiguredAction } from './case-action-rule-engine.js'

export class Case01ContentRepository implements CaseContentRepository {
  private readonly definition = case01Content

  getEvidenceMetadata(caseEvidenceKey: CaseEvidenceKey | undefined) {
    if (!caseEvidenceKey) return undefined
    const hypothesis = this.definition.hypotheses.find((item) =>
      item.evidence.some((evidence) => evidence.evidenceKey === caseEvidenceKey),
    )
    const evidence = hypothesis?.evidence.find((item) => item.evidenceKey === caseEvidenceKey)
    return hypothesis && evidence
      ? { evidenceAxes: evidence.axes, hypothesisThreadIds: [hypothesis.id] }
      : undefined
  }

  getConfirmedEvidenceKey(resolvedKey: string | undefined) {
    return this.definition.evidence.find((evidence) => evidence.key === resolvedKey)
      ?.confirmedEvidenceKey
  }

  getActionOpportunity(
    match: SoloMatch,
    action: BasicInvestigationAction,
    locationId: LocationId,
  ): InvestigationOpportunity {
    if (match.round === 6 && action !== 'analyse') {
      return {
        status: 'exhausted',
        message: 'O prazo final limita novas explorações. Organize as informações já registradas.',
      }
    }

    const resolution = this.resolveAction(match, action, locationId)
    if (resolution.errorMessage) {
      return {
        status: 'exploratory',
        message:
          'Ainda não há sinais claros sobre esta abordagem. Compare as anotações antes de agir.',
      }
    }

    if (
      resolution.entry.type === 'clue' ||
      resolution.additionalEntries?.length ||
      resolution.journalEntryUpdates?.length ||
      resolution.unlockedLocationIds?.length ||
      resolution.resolvedKeys?.length
    ) {
      return {
        status: 'promising',
        message:
          'Os registros sugerem que esta abordagem pode acrescentar contexto, sem garantir uma descoberta.',
      }
    }

    const hasRepeatedAttempt = match.journalEntries.some(
      (entry) =>
        entry.type === 'observation' &&
        entry.actionAttempt === action &&
        entry.locationId === locationId,
    )
    return hasRepeatedAttempt
      ? {
          status: 'exhausted',
          message:
            'As tentativas recentes não trouxeram novos elementos. Compare as anotações ou mude de abordagem.',
        }
      : {
          status: 'exploratory',
          message:
            'Ainda não há sinais claros sobre esta abordagem. A tentativa pode orientar a busca, sem garantir avanço.',
        }
  }

  getAvailableOperations(match: SoloMatch): readonly OperationOption[] {
    return this.definition.operations
      .filter((operation) =>
        match.hypotheses?.some((hypothesis) =>
          operation.availableWhenStatuses.includes(hypothesis.status),
        ),
      )
      .map(({ id, kind, title, riskDescription }) => ({ id, kind, title, riskDescription }))
  }

  resolveOperation(match: SoloMatch, operationId: string, hypothesisId: string) {
    const operation = this.definition.operations.find((item) => item.id === operationId)
    const hypothesis = match.hypotheses?.find((item) => item.id === hypothesisId)
    const outcome = operation?.outcomes.find(
      (item) =>
        item.hypothesisId === hypothesisId && item.whenHypothesisStatus === hypothesis?.status,
    )
    return outcome
      ? { isResolved: outcome.isResolved, observation: outcome.observation }
      : {
          isResolved: false,
          observation:
            'A formalização encontrou uma inconsistência entre os registros. Reavalie as relações já anotadas antes de tentar outra abordagem.',
        }
  }

  getConversation(personId: PersonId) {
    const conversation = getConversation(personId)
    return {
      personName: conversation.personName,
      questions: conversation.questions.map(({ id, text, cost, approach }) => ({
        id,
        text,
        cost,
        approach,
      })),
    }
  }

  isPersonAvailableAtLocation(personId: PersonId, locationId: LocationId): boolean {
    return isPersonAvailableAtLocation(personId, locationId)
  }

  getConversationBlockReason(personId: PersonId, questionId: string, match: SoloMatch) {
    return getConversationBlockReason(personId, questionId, match)
  }

  resolveConversationOutcome(personId: PersonId, questionId: string, match: SoloMatch) {
    return resolveConversationOutcome(personId, questionId, match)
  }

  getConversationReward(personId: PersonId, questionId: string) {
    return getConversationReward(personId, questionId)
  }

  resolveAction(
    match: SoloMatch,
    action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>,
    locationId: LocationId,
  ): CaseActionResolution {
    const preparedCardId = match.decks[match.activeInvestigatorId].hand.find(
      (card) => card.instanceId === match.preparedCardInstanceId,
    )?.definitionId
    const resolution = resolveConfiguredAction(
      this.definition,
      match,
      action,
      locationId,
      preparedCardId,
    )
    return resolveCase01CardEffect(match, action, locationId, preparedCardId, resolution)
  }
}
