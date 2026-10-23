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
        canAccuse: false,
        round: 1,
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

  it('desabilita ações, turno e acusação enquanto espera o servidor', () => {
    const view = mount(InvestigationActions, {
      props: {
        availableActions: ['examine', 'research'],
        actionCosts: { examine: 1, converse: 2, analyse: 2, research: 2 },
        feedback: {
          target: 'Aguardando servidor',
          cost: null,
          cardName: null,
          result: 'A solicitação está em andamento.',
          resultType: 'status',
          status: null,
        },
        canEndTurn: true,
        canAccuse: true,
        isRequestPending: true,
        round: 5,
      },
      global: { stubs: { PhArrowRight: true } },
    })

    expect(
      view
        .findAll('.action-grid button')
        .every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)
    expect(view.get('.end-turn').attributes('disabled')).toBeDefined()
    expect(view.get('.accusation-control button').attributes('disabled')).toBeDefined()
  })
})
