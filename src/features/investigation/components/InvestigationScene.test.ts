import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { locations } from '../../../content/case01'
import InvestigationScene from './InvestigationScene.vue'

describe('InvestigationScene', () => {
  it('libera conversar somente ao selecionar uma pessoa presente no local', async () => {
    const view = mount(InvestigationScene, {
      props: {
        location: locations[0],
        availableActions: ['converse'],
        feedback: '',
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
})
