import type { EvidenceAxis } from './investigation-hypothesis.js'
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

export function legacyCaseEvidenceMetadata(
  caseEvidenceKey: JournalEntry['caseEvidenceKey'],
): Pick<JournalEntry, 'evidenceAxes' | 'hypothesisThreadIds'> | undefined {
  const evidenceAxes = caseEvidenceAxes(caseEvidenceKey)
  return evidenceAxes
    ? { evidenceAxes, hypothesisThreadIds: ['case01-primary-operation'] }
    : undefined
}

function caseEvidenceAxes(
  caseEvidenceKey: JournalEntry['caseEvidenceKey'],
): readonly EvidenceAxis[] | undefined {
  switch (caseEvidenceKey) {
    case 'e1-confirmed':
      return ['means']
    case 'e2-confirmed':
      return ['opportunity']
    case 'e3-confirmed':
    case 'e4-confirmed':
      return ['link']
    case 'e5-confirmed':
      return ['means', 'link']
    case 'e6-confirmed':
      return ['opportunity', 'link']
    default:
      return undefined
  }
}
