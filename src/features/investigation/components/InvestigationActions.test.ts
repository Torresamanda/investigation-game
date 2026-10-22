import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import InvestigationActions from './InvestigationActions.vue'

describe('InvestigationActions', () => {
  it('apresenta alvo, custo, carta e resultado em uma região acessível', () => {
    const view = mount(InvestigationActions, {
      props: {
        availableActions: ['examine'],
        actionCosts: { examine: 1, converse: 2, analyse: 2, research: 2 },
        feedback: {
          target: 'Examinar · Galeria Principal',
          cost: 1,
          cardName: 'Lanterna Ultravioleta',
          result: 'Vestígio no pedestal: óleo escuro e pó fino.',
          resultType: 'clue',
          status: 'indicio',
        },
        canEndTurn: true,
      },
      global: { stubs: { PhArrowRight: true } },
    })

    const feedback = view.get('[role="status"]')
    expect(feedback.attributes('aria-live')).toBe('polite')
    expect(feedback.text()).toContain('Examinar · Galeria Principal')
    expect(feedback.text()).toContain('1 PA gastos')
    expect(feedback.text()).toContain('Lanterna Ultravioleta')
    expect(feedback.text()).toContain('Indício')
    expect(feedback.text()).toContain('Vestígio no pedestal')
  })
})
