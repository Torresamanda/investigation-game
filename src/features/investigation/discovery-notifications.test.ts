import { expect, it } from 'vitest'
import type { PublicMatchDto } from '../../../shared/contracts/match'
import { findNewMatchNotifications } from './discovery-notifications'

type DiscoveryMatchState = Pick<
  PublicMatchDto,
  'id' | 'journalEntries' | 'activeInvestigatorId' | 'decks' | 'notificationEvents'
>

const previous: DiscoveryMatchState = {
  id: 'match-1',
  activeInvestigatorId: 'livia',
  notificationEvents: [],
  journalEntries: [],
  decks: {
    livia: { hand: [], drawPileCount: 0, discardPileCount: 0 },
  },
}

it('apresenta avisos novos registrados no estado autoritativo da partida', () => {
  const current: DiscoveryMatchState = {
    ...previous,
    notificationEvents: [
      { id: 'event-1', kind: 'discovery', round: 1, entryId: 'clue-1' },
      { id: 'event-2', kind: 'clue-refuted', round: 1, entryId: 'clue-2' },
      { id: 'event-3', kind: 'hypothesis-strengthened', round: 1 },
      { id: 'event-4', kind: 'hypothesis-contested', round: 1 },
      { id: 'event-5', kind: 'operation-available', round: 1 },
      { id: 'event-6', kind: 'action-failure', round: 1 },
      { id: 'event-7', kind: 'round-event', round: 2 },
      { id: 'event-8', kind: 'temporary-card', round: 2 },
      { id: 'event-9', kind: 'support-card', round: 2 },
      { id: 'event-10', kind: 'observation', round: 2, entryId: 'observation-1' },
    ],
    journalEntries: [
      {
        id: 'observation-1',
        type: 'observation',
        title: 'Observação',
        content: 'Sem nova pista.',
        locationId: 'gallery',
        round: 1,
        status: 'recorded',
      },
      {
        id: 'clue-1',
        type: 'clue',
        title: 'Pista',
        content: 'Vestígio novo.',
        locationId: 'gallery',
        round: 1,
        status: 'indicio',
      },
      {
        id: 'clue-2',
        type: 'clue',
        title: 'Pista refutada',
        content: 'Vestígio descartado.',
        locationId: 'gallery',
        round: 1,
        status: 'refuted',
      },
    ],
    decks: {
      livia: {
        hand: [
          {
            instanceId: 'temporary-1',
            definitionId: 'guest-list',
            ownerId: 'livia',
            cost: 0,
            compatibleActions: ['research'],
            temporary: true,
          },
        ],
        drawPileCount: 0,
        discardPileCount: 0,
      },
    },
  }

  expect(
    findNewMatchNotifications(previous, current).map((notification) => notification.kind),
  ).toEqual([
    'discovery',
    'clue-refuted',
    'hypothesis-strengthened',
    'hypothesis-contested',
    'operation-available',
    'action-failure',
    'round-event',
    'temporary-card',
    'support-card',
    'observation',
  ])
  expect(findNewMatchNotifications(previous, current)[0].message).toContain('Pista')
  expect(findNewMatchNotifications(current, current)).toEqual([])
  expect(findNewMatchNotifications(null, current)).toEqual([])
})

it('ignora mudanças locais sem evento registrado pelo servidor', () => {
  const updatedJournal = {
    ...previous,
    journalEntries: [
      {
        id: 'local-only-entry',
        type: 'clue' as const,
        title: 'Pista',
        content: 'Não deve gerar aviso local.',
        locationId: 'gallery' as const,
        round: 1,
        status: 'indicio' as const,
      },
    ],
  }

  expect(findNewMatchNotifications(previous, updatedJournal)).toEqual([])
})
