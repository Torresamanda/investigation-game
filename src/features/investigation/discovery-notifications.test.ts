import { expect, it } from 'vitest'
import type { PublicMatchDto } from '../../../shared/contracts/match'
import { findNewDiscoveries } from './discovery-notifications'

type DiscoveryMatchState = Pick<
  PublicMatchDto,
  'id' | 'journalEntries' | 'activeInvestigatorId' | 'decks'
>

const previous: DiscoveryMatchState = {
  id: 'match-1',
  activeInvestigatorId: 'livia',
  journalEntries: [],
  decks: {
    livia: { hand: [], drawPileCount: 0, discardPileCount: 0 },
  },
}

it('notifica pistas, declarações e cartas temporárias novas sem destacar observações', () => {
  const current: DiscoveryMatchState = {
    ...previous,
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
        id: 'statement-1',
        type: 'statement',
        title: 'Declaração',
        content: 'Relato novo.',
        locationId: 'gallery',
        round: 1,
        status: 'recorded',
      },
    ],
    decks: {
      livia: {
        hand: [
          {
            instanceId: 'temporary-1',
            definitionId: 'guest-list',
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

  expect(findNewDiscoveries(previous, current).map((discovery) => discovery.kind)).toEqual([
    'clue',
    'statement',
    'temporary-card',
  ])
  expect(findNewDiscoveries(current, current)).toEqual([])
  expect(findNewDiscoveries(null, current)).toEqual([])
})
