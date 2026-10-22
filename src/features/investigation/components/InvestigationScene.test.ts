import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { locations } from '../../../content/case01'
import { statusFeedback } from '../action-feedback'
import InvestigationScene from './InvestigationScene.vue'

describe('InvestigationScene', () => {
  it('libera conversar somente ao selecionar uma pessoa presente no local', async () => {
    const view = mount(InvestigationScene, {
      props: {
        location: locations[0],
        availableActions: ['converse'],
        actionCosts: { examine: 2, converse: 2, analyse: 2, research: 2 },
        hasConfirmedRaulEvidence: false,
        feedback: statusFeedback(''),
        canEndTurn: true,
        round: 1,
      },
    })
    const conversationButton = () => view.findAll('.action-grid button')[1]!

    expect(view.get('.scene-presence').text()).toBe('Davi Orsini está aqui')
    expect(conversationButton().attributes('disabled')).toBeDefined()
    await view.findAll('.suspect-tile')[2]!.trigger('click')
    expect(conversationButton().attributes('disabled')).toBeDefined()
    await view.findAll('.suspect-tile')[3]!.trigger('click')
    expect(conversationButton().attributes('disabled')).toBeUndefined()
    await conversationButton().trigger('click')
    expect(view.emitted('converse')).toEqual([['davi']])
  })

  it('mantém neutra a abertura da Rodada 4 até haver pista confirmada ligada a Raul', async () => {
    const view = mount(InvestigationScene, {
      props: {
        location: locations[0],
        availableActions: [],
        actionCosts: { examine: 2, converse: 2, analyse: 2, research: 2 },
        hasConfirmedRaulEvidence: false,
        feedback: statusFeedback(''),
        canEndTurn: true,
        round: 4,
      },
    })

    expect(view.get('.narrator').text()).not.toContain('Raul')
    await view.setProps({ hasConfirmedRaulEvidence: true })
    expect(view.get('.narrator').text()).toContain('questionar Raul')
  })
})
