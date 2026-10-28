import { locationIds, personIds } from '../../shared/domain/identifiers.js'
import type { LocationId, PersonId } from '../../shared/domain/identifiers.js'
import type { EvidenceAxis, HypothesisStatus } from '../domain/investigation-hypothesis.js'
import type {
  CaseEvidenceKey,
  ContestableStatementCrossing,
  JournalEntry,
} from '../domain/match.js'

export const caseContentSchemaVersion = 1

export type CaseAction = 'examine' | 'analyse' | 'research'
export type CaseClueStatus = Extract<
  JournalEntry['status'],
  'indicio' | 'unconfirmed' | 'confirmed' | 'refuted'
>
export type CaseConversationApproach = 'inquiry' | 'pressure' | 'context'
export type CaseConversationStatus = 'recorded' | 'contestable' | 'blocked'
export type CaseConversationReward =
  'curator-agenda' | 'treatment-sheet' | 'guest-list' | 'patrol-map'

export interface CaseEvidenceDefinition {
  readonly key: string
  readonly title: string
  readonly content: string
  readonly status: CaseClueStatus
  readonly locationId: LocationId
  readonly unlocksLocationId?: LocationId
  readonly confirmedEvidenceKey?: CaseEvidenceKey
  readonly isFalseLead?: boolean
}

export interface CaseActionRuleDefinition {
  readonly id: string
  readonly action: CaseAction
  readonly locationId: LocationId
  readonly minimumRound?: number
  readonly requiresResolvedKeys?: readonly string[]
  readonly excludesResolvedKeys?: readonly string[]
  readonly preparedCardId?: string
  readonly evidenceKey: string
}

export interface CaseHypothesisEvidenceDefinition {
  readonly evidenceKey: CaseEvidenceKey
  readonly axes: readonly EvidenceAxis[]
}

export interface CaseHypothesisDefinition {
  readonly id: string
  readonly evidence: readonly CaseHypothesisEvidenceDefinition[]
  readonly requiredAxes: readonly EvidenceAxis[]
  readonly minimumCoherentRelations: number
}

export interface CaseOperationOutcomeDefinition {
  readonly hypothesisId: string
  readonly whenHypothesisStatus: HypothesisStatus
  readonly isResolved: boolean
  readonly observation: string
}

export interface CaseOperationDefinition {
  readonly id: string
  readonly kind: 'verify' | 'closure'
  readonly title: string
  readonly riskDescription: string
  readonly availableWhenStatuses: readonly HypothesisStatus[]
  readonly outcomes: readonly CaseOperationOutcomeDefinition[]
}

export interface CaseConversationOutcomeDefinition {
  readonly whenResolvedKeys?: readonly string[]
  readonly status: CaseConversationStatus
  readonly content: string
  readonly contestableCrossing?: ContestableStatementCrossing
}

export interface CaseConversationQuestionDefinition {
  readonly id: string
  readonly text: string
  readonly cost: 1 | 2
  readonly approach: CaseConversationApproach
  readonly result: string
  readonly blockedWhen?: {
    readonly requiresResolvedKeys: readonly string[]
    readonly reason: string
  }
  readonly outcomes?: readonly CaseConversationOutcomeDefinition[]
  readonly reward?: CaseConversationReward
}

export interface CaseConversationDefinition {
  readonly personId: PersonId
  readonly personName: string
  readonly locationId: LocationId
  readonly questions: readonly CaseConversationQuestionDefinition[]
}

export interface CaseContentDefinitionV1 {
  readonly schemaVersion: typeof caseContentSchemaVersion
  readonly caseId: string
  readonly contentVersion: string
  readonly resolvedKeys: readonly string[]
  readonly evidence: readonly CaseEvidenceDefinition[]
  readonly actionRules: readonly CaseActionRuleDefinition[]
  readonly hypotheses: readonly CaseHypothesisDefinition[]
  readonly operations: readonly CaseOperationDefinition[]
  readonly conversations: readonly CaseConversationDefinition[]
}

export function parseCaseContentDefinition(value: unknown): CaseContentDefinitionV1 {
  if (!isCaseContentDefinitionV1(value)) {
    throw new Error('O conteúdo do caso não corresponde ao schema v1.')
  }

  validateCaseContentReferences(value)
  return value
}

function isCaseContentDefinitionV1(value: unknown): value is CaseContentDefinitionV1 {
  if (
    !isRecord(value) ||
    value.schemaVersion !== caseContentSchemaVersion ||
    !isNonEmptyString(value.caseId) ||
    !isNonEmptyString(value.contentVersion) ||
    !isStringArray(value.resolvedKeys) ||
    !isArrayOf(value.evidence, isCaseEvidenceDefinition) ||
    !isArrayOf(value.actionRules, isCaseActionRuleDefinition) ||
    !isArrayOf(value.hypotheses, isCaseHypothesisDefinition) ||
    !isArrayOf(value.operations, isCaseOperationDefinition) ||
    !isArrayOf(value.conversations, isCaseConversationDefinition)
  ) {
    return false
  }

  return true
}

function isCaseEvidenceDefinition(value: unknown): value is CaseEvidenceDefinition {
  return (
    isRecord(value) &&
    isNonEmptyString(value.key) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.content) &&
    isOneOf(value.status, ['indicio', 'unconfirmed', 'confirmed', 'refuted']) &&
    isLocationId(value.locationId) &&
    (value.unlocksLocationId === undefined || isLocationId(value.unlocksLocationId)) &&
    (value.confirmedEvidenceKey === undefined || isCaseEvidenceKey(value.confirmedEvidenceKey)) &&
    (value.isFalseLead === undefined || typeof value.isFalseLead === 'boolean')
  )
}

function isCaseActionRuleDefinition(value: unknown): value is CaseActionRuleDefinition {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isOneOf(value.action, ['examine', 'analyse', 'research']) &&
    isLocationId(value.locationId) &&
    (value.minimumRound === undefined || isPositiveInteger(value.minimumRound)) &&
    (value.requiresResolvedKeys === undefined || isStringArray(value.requiresResolvedKeys)) &&
    (value.excludesResolvedKeys === undefined || isStringArray(value.excludesResolvedKeys)) &&
    (value.preparedCardId === undefined || isNonEmptyString(value.preparedCardId)) &&
    isNonEmptyString(value.evidenceKey)
  )
}

function isCaseHypothesisDefinition(value: unknown): value is CaseHypothesisDefinition {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isArrayOf(value.evidence, isCaseHypothesisEvidenceDefinition) &&
    isArrayOf(value.requiredAxes, isEvidenceAxis) &&
    isNonNegativeInteger(value.minimumCoherentRelations)
  )
}

function isCaseHypothesisEvidenceDefinition(
  value: unknown,
): value is CaseHypothesisEvidenceDefinition {
  return (
    isRecord(value) &&
    isCaseEvidenceKey(value.evidenceKey) &&
    isArrayOf(value.axes, isEvidenceAxis) &&
    value.axes.length > 0
  )
}

function isCaseOperationDefinition(value: unknown): value is CaseOperationDefinition {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isOneOf(value.kind, ['verify', 'closure']) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.riskDescription) &&
    isArrayOf(value.availableWhenStatuses, isHypothesisStatus) &&
    isArrayOf(value.outcomes, isCaseOperationOutcomeDefinition)
  )
}

function isCaseOperationOutcomeDefinition(value: unknown): value is CaseOperationOutcomeDefinition {
  return (
    isRecord(value) &&
    isNonEmptyString(value.hypothesisId) &&
    isHypothesisStatus(value.whenHypothesisStatus) &&
    typeof value.isResolved === 'boolean' &&
    isNonEmptyString(value.observation)
  )
}

function isCaseConversationDefinition(value: unknown): value is CaseConversationDefinition {
  return (
    isRecord(value) &&
    isPersonId(value.personId) &&
    isNonEmptyString(value.personName) &&
    isLocationId(value.locationId) &&
    isArrayOf(value.questions, isCaseConversationQuestionDefinition)
  )
}

function isCaseConversationQuestionDefinition(
  value: unknown,
): value is CaseConversationQuestionDefinition {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.text) &&
    (value.cost === 1 || value.cost === 2) &&
    isOneOf(value.approach, ['inquiry', 'pressure', 'context']) &&
    isNonEmptyString(value.result) &&
    (value.blockedWhen === undefined || isCaseConversationBlockDefinition(value.blockedWhen)) &&
    (value.outcomes === undefined ||
      isArrayOf(value.outcomes, isCaseConversationOutcomeDefinition)) &&
    (value.reward === undefined ||
      isOneOf(value.reward, ['curator-agenda', 'treatment-sheet', 'guest-list', 'patrol-map']))
  )
}

function isCaseConversationBlockDefinition(
  value: unknown,
): value is NonNullable<CaseConversationQuestionDefinition['blockedWhen']> {
  return (
    isRecord(value) && isStringArray(value.requiresResolvedKeys) && isNonEmptyString(value.reason)
  )
}

function isCaseConversationOutcomeDefinition(
  value: unknown,
): value is CaseConversationOutcomeDefinition {
  return (
    isRecord(value) &&
    (value.whenResolvedKeys === undefined || isStringArray(value.whenResolvedKeys)) &&
    isOneOf(value.status, ['recorded', 'contestable', 'blocked']) &&
    isNonEmptyString(value.content) &&
    (value.status === 'contestable'
      ? isContestableStatementCrossing(value.contestableCrossing)
      : value.contestableCrossing === undefined)
  )
}

function isContestableStatementCrossing(value: unknown): value is ContestableStatementCrossing {
  return (
    isRecord(value) &&
    isArrayOf(value.evidenceKeys, isCaseEvidenceKey) &&
    value.evidenceKeys.length > 0 &&
    isOneOf(value.result, ['refuted', 'inconclusive']) &&
    isNonEmptyString(value.observation)
  )
}

function validateCaseContentReferences(definition: CaseContentDefinitionV1): void {
  assertUnique(definition.resolvedKeys, 'chave resolvida')
  const resolvedKeys = new Set(definition.resolvedKeys)
  const evidenceKeys = new Set(definition.evidence.map((evidence) => evidence.key))
  const hypothesisIds = new Set(definition.hypotheses.map((hypothesis) => hypothesis.id))
  const personIdsSeen: string[] = []

  assertUnique(
    definition.evidence.map((evidence) => evidence.key),
    'evidência',
  )
  assertUnique(
    definition.actionRules.map((rule) => rule.id),
    'regra de ação',
  )
  assertUnique(
    definition.hypotheses.map((hypothesis) => hypothesis.id),
    'hipótese',
  )
  assertUnique(
    definition.operations.map((operation) => operation.id),
    'operação',
  )
  assertUnique(
    definition.conversations.map((conversation) => conversation.personId),
    'pessoa da conversa',
  )
  for (const evidence of definition.evidence) {
    assertReference(resolvedKeys, evidence.key, 'chave resolvida da evidência')
  }

  for (const rule of definition.actionRules) {
    assertReference(evidenceKeys, rule.evidenceKey, 'evidência da regra de ação')
    for (const key of [
      ...(rule.requiresResolvedKeys ?? []),
      ...(rule.excludesResolvedKeys ?? []),
    ]) {
      assertReference(resolvedKeys, key, 'chave resolvida da regra de ação')
    }
  }

  for (const hypothesis of definition.hypotheses) {
    for (const evidence of hypothesis.evidence) {
      assertReference(evidenceKeys, evidence.evidenceKey, 'evidência da hipótese')
      const definitionEvidence = definition.evidence.find(
        (item) => item.key === evidence.evidenceKey,
      )
      if (definitionEvidence?.status !== 'confirmed') {
        throw new Error(`A hipótese ${hypothesis.id} referencia evidência não confirmada.`)
      }
    }
  }

  for (const evidence of definition.evidence) {
    if (evidence.confirmedEvidenceKey) {
      assertReference(evidenceKeys, evidence.confirmedEvidenceKey, 'evidência confirmada')
    }
  }

  for (const operation of definition.operations) {
    if (operation.availableWhenStatuses.length === 0 || operation.outcomes.length === 0) {
      throw new Error(`A operação ${operation.id} precisa de disponibilidade e resultados.`)
    }
    for (const outcome of operation.outcomes) {
      assertReference(hypothesisIds, outcome.hypothesisId, 'hipótese do resultado de operação')
    }
    assertUnique(
      operation.outcomes.map(
        (outcome) => `${outcome.hypothesisId}:${outcome.whenHypothesisStatus}`,
      ),
      'resultado de operação',
    )
  }

  for (const conversation of definition.conversations) {
    personIdsSeen.push(conversation.personId)
    assertUnique(
      conversation.questions.map((question) => question.id),
      'pergunta',
    )
    for (const question of conversation.questions) {
      for (const key of [
        ...(question.blockedWhen?.requiresResolvedKeys ?? []),
        ...(question.outcomes ?? []).flatMap((outcome) => outcome.whenResolvedKeys ?? []),
      ]) {
        assertReference(resolvedKeys, key, 'chave resolvida da conversa')
      }
    }
  }
  assertUnique(personIdsSeen, 'pessoa da conversa')
  for (const hypothesis of definition.hypotheses) {
    if (hypothesis.evidence.length === 0 || hypothesis.requiredAxes.length === 0) {
      throw new Error(`A hipótese ${hypothesis.id} precisa de evidências e eixos.`)
    }
  }
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`O conteúdo do caso contém ${label} duplicada.`)
  }
}

function assertReference(knownValues: ReadonlySet<string>, value: string, label: string): void {
  if (!knownValues.has(value)) {
    throw new Error(`O conteúdo do caso referencia ${label} inexistente: ${value}.`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isArrayOf<Value>(
  value: unknown,
  isValue: (candidate: unknown) => candidate is Value,
): value is Value[] {
  return Array.isArray(value) && value.every(isValue)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isOneOf<Value extends string>(value: unknown, values: readonly Value[]): value is Value {
  return typeof value === 'string' && values.some((candidate) => candidate === value)
}

function isLocationId(value: unknown): value is LocationId {
  return typeof value === 'string' && locationIds.some((candidate) => candidate === value)
}

function isPersonId(value: unknown): value is PersonId {
  return typeof value === 'string' && personIds.some((candidate) => candidate === value)
}

function isEvidenceAxis(value: unknown): value is EvidenceAxis {
  return isOneOf(value, ['means', 'opportunity', 'link'])
}

function isHypothesisStatus(value: unknown): value is HypothesisStatus {
  return isOneOf(value, ['inquiry', 'plausible', 'sustained', 'contested', 'discarded'])
}

function isCaseEvidenceKey(value: unknown): value is CaseEvidenceKey {
  return isOneOf(value, [
    'e1-confirmed',
    'e2-confirmed',
    'e3-confirmed',
    'e4-confirmed',
    'e5-confirmed',
    'e6-confirmed',
  ])
}
