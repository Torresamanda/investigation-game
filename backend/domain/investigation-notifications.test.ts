import { expect, it } from 'vitest'
import type { OperationOption } from './investigation-operation.js'
import { appendInvestigationNotifications } from './investigation-notifications.js'
import { createSoloMatch } from './match.js'

const baseMatch = createSoloMatch({
  id: 'match-notifications',
  activeInvestigatorId: 'livia',
  supportInvestigatorId: 'rafael',
  createdAt: '2026-10-27T00:00:00.000Z',
  nextRandomInt: () => 0,
})

it('registra eventos autoritativos para progresso investigativo e mudanças da rodada', () => {
  const previous = {
    ...baseMatch,
    notificationEvents: [],
    hypotheses: [
      {
        id: 'route',
        status: 'inquiry' as const,
        evidence: [],
        coherentRelationIds: [],
        hasOperationalInconsistency: false,
      },
    ],
  }
  const current = {
    ...previous,
    round: 2,
    hypotheses: [{ ...previous.hypotheses[0], status: 'plausible' as const }],
    journalEntries: [
      {
        id: 'refuted-clue',
        type: 'clue' as const,
        title: 'Vestígio refutado',
        content: 'A pista não se sustenta.',
        locationId: 'gallery' as const,
        round: 1,
        status: 'refuted' as const,
      },
      {
        id: 'failed-action',
        type: 'observation' as const,
        title: 'Sem nova descoberta',
        content: 'A tentativa não revelou informação nova.',
        locationId: 'gallery' as const,
        round: 2,
        status: 'note' as const,
        notificationSignal: 'action-failure' as const,
      },
    ],
  }
  const verifyOperation: OperationOption = {
    id: 'verify-the-theory',
    kind: 'verify',
    title: 'Verificar a linha de raciocínio',
    riskDescription: 'Pode revelar uma inconsistência.',
  }

  const updated = appendInvestigationNotifications(previous, current, [], [verifyOperation])

  expect(updated.notificationEvents?.map((event) => event.kind)).toEqual([
    'round-event',
    'clue-refuted',
    'action-failure',
    'hypothesis-strengthened',
    'operation-available',
  ])
  expect(updated.notificationEvents?.map((event) => event.id)).toEqual([
    'match-notifications:notification:1',
    'match-notifications:notification:2',
    'match-notifications:notification:3',
    'match-notifications:notification:4',
    'match-notifications:notification:5',
  ])
})

it('não gera novos eventos para uma gravação inicial nem avisa ao repetir o mesmo estado', () => {
  const initial = appendInvestigationNotifications(undefined, baseMatch, [], [])
  const unchanged = appendInvestigationNotifications(initial, initial, [], [])

  expect(initial.notificationEvents).toEqual([])
  expect(unchanged.notificationEvents).toEqual([])
})
