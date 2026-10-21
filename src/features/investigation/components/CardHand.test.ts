import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { investigators } from '../../../content/investigators'
import { getInvestigatorCards } from '../../../content/cards'
import CardHand from './CardHand.vue'

describe('artes por investigador', () => {
  it.each(investigators)('mostra somente as cartas e imagens de $name', (investigator) => {
    const cards = getInvestigatorCards(investigator.id)
    const view = mount(CardHand, { props: { cards, ownerLabel: investigator.name } })
    expect(view.findAll('.investigation-card')).toHaveLength(4)
    expect(view.findAll('.card-name').map((card) => card.text())).toEqual(
      cards.map((card) => card.name),
    )
    expect(view.findAll('.card-illustration').map((img) => img.attributes('src'))).toEqual(
      cards.map((card) => card.image),
    )
    view.unmount()
  })

  it('abre o efeito e o contexto da carta sem permitir seu uso na prévia', async () => {
    // jsdom does not provide the browser's native modal API.
    const showModal = vi.fn()
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: showModal,
    })
    const view = mount(CardHand, {
      props: { cards: getInvestigatorCards('livia'), ownerLabel: 'Lívia Serrano' },
    })
    await view.findAll('.investigation-card')[0]!.trigger('click')
    expect(showModal).toHaveBeenCalledOnce()
    expect(view.get('.card-details').text()).toContain('Durante Examinar um local.')
    expect(view.get('.card-details').text()).toContain('Somente no turno do dono.')
    await view.get('.card-detail-close').trigger('click')
    expect(view.find('.card-details').exists()).toBe(false)
    view.unmount()
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  })
})
