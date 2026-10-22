import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { locations } from '../../../content/case01'
import SuspectSection from './SuspectSection.vue'

describe('SuspectSection', () => {
  it('seleciona um personagem e abre o perfil dentro da seção de personagens', async () => {
    const view = mount(SuspectSection, {
      props: { modelValue: null, location: locations[0] },
      global: { stubs: { PhUserFocus: true, PhX: true } },
    })

    await view.findAll('.suspect-tile')[2]!.trigger('click')

    expect(view.get('.suspect-section').attributes('aria-label')).toBe('Pessoas de interesse')
    expect(view.find('.suspect-section > .suspects-overview').exists()).toBe(true)
    expect(view.get('.suspect-section > .suspect-profile').text()).toContain('Marta Lobo')
    expect(view.emitted('update:modelValue')).toEqual([['marta']])
    await view.findAll('.suspect-tile')[3]!.trigger('click')
    expect(view.get('.suspect-section > .suspect-profile').text()).toContain('Davi Orsini')
  })
})
