import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import InvestigationActions from './InvestigationActions.vue'

describe('InvestigationActions', () => {
  it('confirma inline apenas quando ainda há PA utilizáveis', async () => {
    const view = mount(InvestigationActions, {
      props: {
        availableActions: ['examine'],
        actionCosts: { examine: 2, converse: 2, analyse: 2, research: 2 },
        feedback: {
          target: 'Investigação',
          cost: null,
          cardName: null,
          result: 'Aguardando decisão.',
          resultType: 'status',
          status: null,
        },
        canEndTurn: true,
        hasUsableActionPoints: true,
        canAccuse: false,
        round: 1,
      },
    })

    await view.get('.end-turn').trigger('click')
    expect(view.emitted('endTurn')).toBeUndefined()
    expect(view.get('.end-turn-confirmation').text()).toContain('PA utilizáveis')

    await view.findAll('.end-turn-confirmation-actions button')[0]!.trigger('click')
    expect(view.find('.end-turn-confirmation').exists()).toBe(false)
    expect(view.emitted('endTurn')).toBeUndefined()

    await view.get('.end-turn').trigger('click')
    await view.findAll('.end-turn-confirmation-actions button')[1]!.trigger('click')
    expect(view.emitted('endTurn')).toHaveLength(1)
    expect(view.find('.end-turn-confirmation').exists()).toBe(false)

    await view.setProps({ hasUsableActionPoints: false })
    await view.get('.end-turn').trigger('click')
    expect(view.emitted('endTurn')).toHaveLength(2)
  })

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
        hasUsableActionPoints: false,
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
        hasUsableActionPoints: false,
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
