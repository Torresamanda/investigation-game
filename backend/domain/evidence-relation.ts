import type {
  ContestableStatementCrossingRecord,
  JournalEntry,
  InvestigativeRelation,
} from './match.js'
import { findCoherentConnection } from './coherent-connection.js'

export interface ConfirmedEvidenceRelation {
  readonly fromEntry: JournalEntry
  readonly toEntry: JournalEntry
  readonly hypothesisThreadId: string
}

export interface ContestableStatementRelation {
  readonly statement: JournalEntry
  readonly clue: JournalEntry
}

export function findConfirmedEvidenceRelation(
  entries: readonly JournalEntry[],
  fromClueId: string,
  toClueId: string,
): ConfirmedEvidenceRelation | undefined {
  if (fromClueId === toClueId) return undefined

  const fromEntry = entries.find(
    (entry) => entry.id === fromClueId && entry.type === 'clue' && entry.status === 'confirmed',
  )
  const toEntry = entries.find(
    (entry) => entry.id === toClueId && entry.type === 'clue' && entry.status === 'confirmed',
  )
  if (!fromEntry || !toEntry) return undefined

  const coherentRelation = findCoherentConnection(fromEntry, toEntry)
  if (!coherentRelation) return undefined

  return { fromEntry, toEntry, hypothesisThreadId: coherentRelation.hypothesisThreadId }
}

export function hasInvestigativeRelation(
  relations: readonly InvestigativeRelation[],
  firstClueId: string,
  secondClueId: string,
): boolean {
  const pair = sortedPair(firstClueId, secondClueId)
  return relations.some(
    (relation) => sortedPair(relation.fromClueId, relation.toClueId).join(':') === pair.join(':'),
  )
}

export function findContestableStatementRelation(
  entries: readonly JournalEntry[],
  statementId: string,
  clueId: string,
): ContestableStatementRelation | undefined {
  const statement = entries.find(
    (entry) =>
      entry.id === statementId &&
      entry.type === 'statement' &&
      entry.status === 'contestable' &&
      entry.contestableCrossing,
  )
  const clue = entries.find(
    (entry) => entry.id === clueId && entry.type === 'clue' && entry.status === 'confirmed',
  )
  const contestableCrossing = statement?.contestableCrossing
  if (!statement || !contestableCrossing || !clue || !clue.caseEvidenceKey) return undefined

  return contestableCrossing.evidenceKeys.includes(clue.caseEvidenceKey)
    ? { statement, clue }
    : undefined
}

export function hasAvailableContestableStatementRelation(
  entries: readonly JournalEntry[],
  completedCrossings: readonly ContestableStatementCrossingRecord[],
): boolean {
  return entries.some(
    (statement) =>
      statement.type === 'statement' &&
      statement.status === 'contestable' &&
      statement.contestableCrossing &&
      entries.some(
        (clue) =>
          clue.type === 'clue' &&
          clue.status === 'confirmed' &&
          clue.caseEvidenceKey &&
          statement.contestableCrossing!.evidenceKeys.includes(clue.caseEvidenceKey) &&
          !completedCrossings.some(
            (crossing) => crossing.statementId === statement.id && crossing.clueId === clue.id,
          ),
      ),
  )
}

export function sortedPair(firstClueId: string, secondClueId: string): [string, string] {
  return firstClueId <= secondClueId ? [firstClueId, secondClueId] : [secondClueId, firstClueId]
}
