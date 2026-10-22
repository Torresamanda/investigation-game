import type { JournalEntry, SoloMatch } from './match.js'

export interface ClueConnectionCandidate {
  readonly confirmedEntry: JournalEntry
  readonly pendingEntry: JournalEntry
  readonly key: string
}

export function findClueConnectionCandidate(match: SoloMatch): ClueConnectionCandidate | undefined {
  const confirmedEntries = match.journalEntries.filter(
    (entry) => entry.type === 'clue' && entry.status === 'confirmed',
  )
  const pendingEntries = match.journalEntries.filter(
    (entry) =>
      entry.type === 'clue' && (entry.status === 'unconfirmed' || entry.status === 'indicio'),
  )

  for (const confirmedEntry of confirmedEntries) {
    for (const pendingEntry of pendingEntries) {
      const key = `investigator-connection:${confirmedEntry.id}:${pendingEntry.id}`
      if (confirmedEntry.id !== pendingEntry.id && !match.resolvedKeys.includes(key)) {
        return { confirmedEntry, pendingEntry, key }
      }
    }
  }

  return undefined
}
