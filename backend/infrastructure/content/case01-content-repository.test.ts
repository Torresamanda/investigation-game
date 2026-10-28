import { describe, expect, it } from 'vitest'
import { Case01ContentRepository } from './case01-content-repository.js'
import { createSoloMatch } from '../../domain/match.js'

function createMatch() {
  return createSoloMatch({
    id: 'case01-content-test',
    activeInvestigatorId: 'livia',
    supportInvestigatorId: 'rafael',
    createdAt: '2026-10-27T12:00:00.000Z',
    nextRandomInt: () => 0,
  })
}

describe('Case01ContentRepository', () => {
  it('exposes conversation options without private conditions or future outcomes', () => {
    const content = new Case01ContentRepository()
    const serializedOptions = JSON.stringify(content.getConversation('helena'))

    expect(serializedOptions).not.toContain('gallery-lock')
    expect(serializedOptions).not.toContain('blockedWhen')
    expect(serializedOptions).not.toContain('outcomes')
  })

  it('keeps both false leads outside confirmed hypothesis evidence', () => {
    const content = new Case01ContentRepository()
    const match = createMatch()

    const restorationRecord = content.resolveAction(
      {
        ...match,
        round: 3,
        resolvedKeys: ['gallery-lock', 'marta-tools'],
      },
      'analyse',
      'laboratory',
    )
    const insuranceRecord = content.resolveAction(
      {
        ...match,
        round: 3,
        resolvedKeys: ['helena-insurance'],
      },
      'research',
      'office',
    )

    expect(restorationRecord.entry).toMatchObject({ type: 'clue', status: 'refuted' })
    expect(insuranceRecord.entry).toMatchObject({ type: 'clue', status: 'refuted' })
    expect(restorationRecord.entry.caseEvidenceKey).toBeUndefined()
    expect(insuranceRecord.entry.caseEvidenceKey).toBeUndefined()
  })
})
