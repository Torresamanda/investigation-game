import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccusationDialog from './AccusationDialog.vue'
import type { MatchJournalEntry } from '../../../services/game-api'
import { suspectProfiles } from '../../../content/case01'

const suspects = suspectProfiles.filter((suspect) => suspect.id === 'raul')

const clues: readonly MatchJournalEntry[] = ['one', 'two', 'three'].map((id) => ({
  id,
  type: 'clue',
  title: `Pista ${id}`,
  content: 'Confirmada.',
  locationId: 'security',
  round: 4,
  status: 'confirmed',
}))

describe('AccusationDialog', () => {
  it('permanece no painel contextual sem botão de fechar redundante', () => {
    const view = mount(AccusationDialog, {
      props: {
        suspects,
        confirmedClues: clues,
        connectionCount: 2,
        actionPoints: { general: 3, specialty: 2, specialtyPoint: 'research' },
        errorMessage: null,
      },
    })

    expect(view.find('[aria-label="Fechar acusação"]').exists()).toBe(false)
  })

  it('submete pessoa e uma pista confirmada por eixo quando o dossiê está sustentado', async () => {
    const view = mount(AccusationDialog, {
      props: {
        suspects,
        confirmedClues: clues,
        connectionCount: 2,
        actionPoints: { general: 3, specialty: 2, specialtyPoint: 'research' },
        errorMessage: null,
      },
    })

    const selects = view.findAll('select')
    await selects[0]!.setValue('raul')
    await selects[1]!.setValue('one')
    await selects[2]!.setValue('two')
    await selects[3]!.setValue('three')
    await view.get('.button-primary').trigger('click')

    expect(view.emitted('accuse')).toEqual([
      [
        {
          suspectId: 'raul',
          meansClueId: 'one',
          opportunityClueId: 'two',
          linkClueId: 'three',
        },
      ],
    ])
  })

  it('informa os requisitos pendentes e desabilita envio sem 3 PA gerais', () => {
    const view = mount(AccusationDialog, {
      props: {
        suspects,
        confirmedClues: clues,
        connectionCount: 1,
        actionPoints: { general: 2, specialty: 2, specialtyPoint: 'research' },
        errorMessage: null,
      },
    })

    expect(view.get('.accusation-readiness').text()).toContain('1 conexão')
    expect(view.get('.button-primary').attributes('disabled')).toBeDefined()
  })
})
