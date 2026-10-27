import type { JournalEntry } from './match.js'

export interface CoherentConnection {
  readonly hypothesisThreadId: string
}

export function findCoherentConnection(
  fromEntry: JournalEntry,
  toEntry: JournalEntry,
): CoherentConnection | undefined {
  if (!isConfirmedEvidence(fromEntry) || !isConfirmedEvidence(toEntry)) return undefined

  const sharedThread = fromEntry.hypothesisThreadIds?.find((threadId) =>
    toEntry.hypothesisThreadIds?.includes(threadId),
  )
  if (!sharedThread) return undefined

  const hasDistinctAxes = fromEntry.evidenceAxes?.some(
    (axis) => !toEntry.evidenceAxes?.includes(axis),
  )
  return hasDistinctAxes ? { hypothesisThreadId: sharedThread } : undefined
}

function isConfirmedEvidence(entry: JournalEntry): boolean {
  return entry.type === 'clue' && entry.status === 'confirmed'
}
