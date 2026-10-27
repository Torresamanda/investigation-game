import { describe, expect, it } from 'vitest'
import {
  createInvestigationHypothesis,
  synchronizeInvestigationHypotheses,
} from './investigation-hypothesis.js'
import { MatchPresenter } from '../presenters/match-presenter.js'
import { createSoloMatch } from './match.js'

const evidence = [
  { entryId: 'means', axis: 'means' as const },
  { entryId: 'opportunity', axis: 'opportunity' as const },
  { entryId: 'link', axis: 'link' as const },
]

describe('createInvestigationHypothesis', () => {
  it('marks a hypothesis as sustained only with all axes and two validated relations', () => {
    const hypothesis = createInvestigationHypothesis('route', evidence, [
      { id: 'connection-1', fromEntryId: 'means', toEntryId: 'opportunity' },
      { id: 'connection-2', fromEntryId: 'opportunity', toEntryId: 'link' },
    ])

    expect(hypothesis.status).toBe('sustained')
  })

  it('keeps incomplete reasoning plausible instead of treating it as a solved case', () => {
    const hypothesis = createInvestigationHypothesis('route', evidence.slice(0, 2), [
      { id: 'connection-1', fromEntryId: 'means', toEntryId: 'opportunity' },
    ])

    expect(hypothesis.status).toBe('plausible')
  })

  it('contests an otherwise sustained hypothesis after an operational inconsistency', () => {
    const hypothesis = createInvestigationHypothesis(
      'route',
      evidence,
      [
        { id: 'connection-1', fromEntryId: 'means', toEntryId: 'opportunity' },
        { id: 'connection-2', fromEntryId: 'opportunity', toEntryId: 'link' },
      ],
      true,
    )

    expect(hypothesis.status).toBe('contested')
  })

  it('derives progress from confirmed evidence and validated coherent relations only', () => {
    const hypotheses = synchronizeInvestigationHypotheses(
      [
        { id: 'means', evidenceAxes: ['means'], hypothesisThreadIds: ['route'] },
        {
          id: 'opportunity',
          evidenceAxes: ['opportunity'],
          hypothesisThreadIds: ['route'],
        },
        { id: 'link', evidenceAxes: ['link'], hypothesisThreadIds: ['route'] },
      ],
      [
        {
          id: 'relation-1',
          fromClueId: 'means',
          toClueId: 'opportunity',
          hypothesisThreadId: 'route',
        },
        {
          id: 'relation-2',
          fromClueId: 'opportunity',
          toClueId: 'link',
          hypothesisThreadId: 'route',
        },
      ],
      [],
    )

    expect(hypotheses).toMatchObject([{ id: 'route', status: 'sustained' }])
  })

  it('keeps private hypothesis identifiers out of the public match DTO', () => {
    const match = createSoloMatch({
      id: 'match',
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
      createdAt: '2026-10-26T00:00:00.000Z',
      nextRandomInt: () => 0,
    })
    const hypothesis = createInvestigationHypothesis('private-route', evidence, [
      { id: 'connection-1', fromEntryId: 'means', toEntryId: 'opportunity' },
      { id: 'connection-2', fromEntryId: 'opportunity', toEntryId: 'link' },
    ])

    const publicMatch = MatchPresenter.toPublicDto({
      ...match,
      hypotheses: [hypothesis],
      notificationEvents: [{ id: 'event-1', kind: 'hypothesis-strengthened', round: 2 }],
      journalEntries: [
        {
          id: 'entry-1',
          type: 'observation',
          title: 'Observação',
          content: 'Tentativa registrada.',
          locationId: 'gallery',
          round: 2,
          status: 'note',
          notificationSignal: 'action-failure',
        },
      ],
    })

    expect(publicMatch.hypotheses).toEqual([
      {
        status: 'sustained',
        evidenceEntryIds: ['means', 'opportunity', 'link'],
        coveredAxes: ['means', 'opportunity', 'link'],
        coherentRelationCount: 2,
      },
    ])
    expect(JSON.stringify(publicMatch)).not.toContain('private-route')
    expect(publicMatch.notificationEvents).toEqual([
      { id: 'event-1', kind: 'hypothesis-strengthened', round: 2 },
    ])
    expect(publicMatch.journalEntries[0]).not.toHaveProperty('notificationSignal')
  })
})
