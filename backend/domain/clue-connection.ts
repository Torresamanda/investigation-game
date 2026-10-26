import type { JournalEntry, SoloMatch } from './match.js'
import { findCoherentConnection } from './coherent-connection.js'

export interface ClueConnectionCandidate {
  readonly fromEntry: JournalEntry
  readonly toEntry: JournalEntry
  readonly hypothesisThreadId: string
  readonly key: string
}

export function findClueConnectionCandidate(match: SoloMatch): ClueConnectionCandidate | undefined {
  const confirmedEntries = match.journalEntries.filter(
    (entry) => entry.type === 'clue' && entry.status === 'confirmed',
  )
  for (const fromEntry of confirmedEntries) {
    for (const toEntry of confirmedEntries) {
      const coherentConnection = findCoherentConnection(fromEntry, toEntry)
      const key = `investigator-connection:${fromEntry.id}:${toEntry.id}`
      if (fromEntry.id !== toEntry.id && coherentConnection && !match.resolvedKeys.includes(key)) {
        return {
          fromEntry,
          toEntry,
          hypothesisThreadId: coherentConnection.hypothesisThreadId,
          key,
        }
      }
    }
  }

  return undefined
}
