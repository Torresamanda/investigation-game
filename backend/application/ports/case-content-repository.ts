import type {
  InvestigationAction,
  LocationId,
  PersonId,
} from '../../../shared/domain/identifiers.js'
import type { JournalConnection, JournalEntry, SoloMatch } from '../../domain/match.js'
import type { OperationOption } from '../../domain/investigation-operation.js'

export type NewJournalEntry = Omit<JournalEntry, 'id'>

export interface ConversationQuestionContent {
  readonly id: string
  readonly text: string
  readonly cost: 1 | 2
  readonly approach: 'inquiry' | 'pressure' | 'context'
}

export interface ConversationContent {
  readonly personName: string
  readonly questions: readonly ConversationQuestionContent[]
}

export interface ConversationOutcomeContent {
  readonly content: string
  readonly status: 'recorded' | 'contestable' | 'blocked'
}

export interface CaseActionResolution {
  readonly entry: JournalEntry
  readonly resolvedKey?: string
  readonly additionalEntries?: readonly NewJournalEntry[]
  readonly resolvedKeys?: readonly string[]
  readonly unlockedLocationIds?: readonly LocationId[]
  readonly journalEntryUpdates?: readonly JournalEntry[]
  readonly journalConnection?: Omit<JournalConnection, 'round'>
  readonly errorMessage?: string
}

export interface CaseOperationResolution {
  readonly isResolved: boolean
  readonly observation: string
}

export interface CaseContentRepository {
  getAvailableOperations(match: SoloMatch): readonly OperationOption[]
  resolveOperation(
    match: SoloMatch,
    operationId: string,
    hypothesisId: string,
  ): CaseOperationResolution
  getConversation(personId: PersonId): ConversationContent
  isPersonAvailableAtLocation(personId: PersonId, locationId: LocationId): boolean
  getConversationBlockReason(
    personId: PersonId,
    questionId: string,
    match: SoloMatch,
  ): string | undefined
  resolveConversationOutcome(
    personId: PersonId,
    questionId: string,
    match: SoloMatch,
  ): ConversationOutcomeContent | undefined
  getConversationReward(
    personId: PersonId,
    questionId: string,
  ): 'curator-agenda' | 'treatment-sheet' | 'guest-list' | 'patrol-map' | undefined
  resolveAction(
    match: SoloMatch,
    action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>,
    locationId: LocationId,
  ): CaseActionResolution
}
