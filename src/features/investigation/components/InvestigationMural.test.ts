import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { MatchJournalEntry } from '../../../services/game-api'
import InvestigationMural from './InvestigationMural.vue'

const journalEntries: readonly MatchJournalEntry[] = [
  {
    id: 'clue-means',
    type: 'clue',
    title: 'Registro de acesso',
    content: 'O registro confirma uma entrada.',
    locationId: 'security',
    round: 2,
    status: 'confirmed',
  },
  {
    id: 'clue-link',
    type: 'clue',
    title: 'Marca no pedestal',
    content: 'Há uma marca recente.',
    locationId: 'gallery',
    round: 3,
    status: 'confirmed',
  },
  {
    id: 'statement',
    type: 'statement',
    title: 'Declaração do vigia',
    content: 'O vigia descreve a noite.',
    locationId: 'security',
    round: 3,
    status: 'contestable',
    contestableWithEntryIds: ['clue-link'],
  },
]

function mountMural() {
  return mount(InvestigationMural, {
    props: {
      journalEntries,
      muralLinks: [
        { id: 'visual-link', fromClueId: 'clue-means', toClueId: 'clue-link', round: 3 },
      ],
      investigativeCrossingCost: 1,
      canAffordInvestigativeCrossing: true,
      isRequestPending: false,
    },
  })
}

describe('InvestigationMural', () => {
  it('shows confirmed clues, visual connections and contestable evidence cards', () => {
    const mural = mountMural()

    expect(mural.findAll('.mural-evidence-card')).toHaveLength(3)
    expect(mural.findAll('.mural-line')).toHaveLength(2)
    expect(mural.text()).toContain('Registro de acesso')
    expect(mural.text()).toContain('Declaração do vigia')
  })

  it('draws a free visual link by selecting two cards without dragging', async () => {
    const mural = mountMural()
    const cards = mural.findAll('.mural-evidence-card')

    await cards[0]!.trigger('click')
    await cards[1]!.trigger('click')
    expect(mural.get('.mural-draw-button').text()).toContain('Grátis')
    await mural.get('.mural-draw-button').trigger('click')

    expect(mural.emitted('createMuralLink')).toEqual([['clue-means', 'clue-link']])
    expect(mural.emitted('createInvestigativeCrossing')).toBeUndefined()
  })

  it('requires a selected connection and a separate cost confirmation to cross it', async () => {
    const mural = mountMural()

    expect(mural.find('.mural-selection-detail').exists()).toBe(false)
    await mural.findAll('.mural-connection-choice')[1]!.trigger('click')
    expect(mural.get('.mural-selection-detail').text()).toContain('1 PA')
    await mural.get('.mural-secondary-button').trigger('click')
    expect(mural.emitted('createInvestigativeCrossing')).toBeUndefined()
    expect(mural.get('.mural-crossing-confirmation').text()).toContain('consumirá 1 PA')
    await mural.get('.mural-primary-button').trigger('click')

    expect(mural.emitted('createInvestigativeCrossing')).toEqual([['statement', 'clue-link']])
  })
})
