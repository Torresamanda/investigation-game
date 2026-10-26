import { describe, expect, it } from 'vitest'
import { findCoherentConnection } from './coherent-connection.js'
import type { JournalEntry } from './match.js'

function confirmedEvidence(
  id: string,
  evidenceAxes: JournalEntry['evidenceAxes'],
  hypothesisThreadIds = ['route'],
): JournalEntry {
  return {
    id,
    type: 'clue',
    title: id,
    content: id,
    locationId: 'gallery',
    round: 1,
    status: 'confirmed',
    evidenceAxes,
    hypothesisThreadIds,
  }
}

describe('findCoherentConnection', () => {
  it('accepts confirmed evidence that shares a reasoning thread and covers distinct axes', () => {
    expect(
      findCoherentConnection(
        confirmedEvidence('means', ['means']),
        confirmedEvidence('opportunity', ['opportunity']),
      ),
    ).toEqual({ hypothesisThreadId: 'route' })
  })

  it('rejects an irrelevant pair even when both entries are confirmed', () => {
    expect(
      findCoherentConnection(
        confirmedEvidence('means', ['means'], ['route-a']),
        confirmedEvidence('opportunity', ['opportunity'], ['route-b']),
      ),
    ).toBeUndefined()
  })

  it('rejects two facts that only repeat the same axis', () => {
    expect(
      findCoherentConnection(
        confirmedEvidence('means-a', ['means']),
        confirmedEvidence('means-b', ['means']),
      ),
    ).toBeUndefined()
  })
})
