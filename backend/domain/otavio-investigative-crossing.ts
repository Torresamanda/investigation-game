import type { JournalEntry, SoloMatch } from './match.js'
import { findConfirmedEvidenceRelation, hasInvestigativeRelation } from './evidence-relation.js'

export interface OtavioInvestigativeCrossingCandidate {
  readonly fromEntry: JournalEntry
  readonly toEntry: JournalEntry
  readonly hypothesisThreadId: string
  readonly key: string
}

export function findOtavioInvestigativeCrossingCandidate(
  match: SoloMatch,
): OtavioInvestigativeCrossingCandidate | undefined {
  const confirmedEntries = match.journalEntries.filter(
    (entry) => entry.type === 'clue' && entry.status === 'confirmed',
  )
  for (const fromEntry of confirmedEntries) {
    for (const toEntry of confirmedEntries) {
      const coherentRelation = findConfirmedEvidenceRelation(
        match.journalEntries,
        fromEntry.id,
        toEntry.id,
      )
      const key = `otavio-investigative-relation:${fromEntry.id}:${toEntry.id}`
      if (
        coherentRelation &&
        !hasInvestigativeRelation(match.investigativeRelations ?? [], fromEntry.id, toEntry.id) &&
        !match.resolvedKeys.includes(key)
      ) {
        return {
          fromEntry,
          toEntry,
          hypothesisThreadId: coherentRelation.hypothesisThreadId,
          key,
        }
      }
    }
  }

  return undefined
}
