import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { locations } from '../../../content/case01'
import InvestigationScene from './InvestigationScene.vue'

describe('InvestigationScene', () => {
  it('apresenta a localização atual e a abertura narrativa da rodada', () => {
    const view = mount(InvestigationScene, {
      props: {
        location: locations[0],
        hasConfirmedRaulEvidence: false,
        round: 1,
      },
    })

    expect(view.get('.scene-panel h2').text()).toBe('Galeria Principal')
    expect(view.get('.scene-panel').text()).toContain('01 / 05')
    expect(view.get('.narrator').text()).toContain('Sete minutos sem imagem')
  })

  it('mantém neutra a abertura da Rodada 4 até haver pista confirmada ligada a Raul', async () => {
    const view = mount(InvestigationScene, {
      props: {
        location: locations[0],
        hasConfirmedRaulEvidence: false,
        round: 4,
      },
    })

    expect(view.get('.narrator').text()).not.toContain('Raul')
    await view.setProps({ hasConfirmedRaulEvidence: true })
    expect(view.get('.narrator').text()).toContain('questionar Raul')
  })
})
