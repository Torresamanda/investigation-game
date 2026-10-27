import type { JournalEntry, InvestigativeRelation } from './match.js'
import { findCoherentConnection } from './coherent-connection.js'

export interface ConfirmedEvidenceRelation {
  readonly fromEntry: JournalEntry
  readonly toEntry: JournalEntry
  readonly hypothesisThreadId: string
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

export function sortedPair(firstClueId: string, secondClueId: string): [string, string] {
  return firstClueId <= secondClueId ? [firstClueId, secondClueId] : [secondClueId, firstClueId]
}
