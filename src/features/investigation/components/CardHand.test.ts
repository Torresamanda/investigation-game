import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { investigators } from '../../../content/investigators'
import { getInvestigatorCards } from '../../../content/cards'
import CardHand from './CardHand.vue'

describe('artes por investigador', () => {
  it.each(investigators)('mostra somente as cartas e imagens de $name', (investigator) => {
    const cards = getInvestigatorCards(investigator.id).map((card, index) => ({
      ...card,
      instanceId: `${investigator.id}:${card.id}:${index}`,
    }))
    const view = mount(CardHand, {
      props: {
        cards,
        ownerLabel: investigator.name,
        preparedCardId: null,
        canDiscardPreparedCard: false,
      },
    })
    expect(view.findAll('.investigation-card')).toHaveLength(4)
    expect(view.findAll('.card-name').map((card) => card.text())).toEqual(
      cards.map((card) => card.name),
    )
    expect(view.findAll('.card-illustration').map((img) => img.attributes('src'))).toEqual(
      cards.map((card) => card.image),
    )
    view.unmount()
  })

  it('prepara a carta pelo clique e abre informações somente pelo botão de detalhes', async () => {
    // jsdom does not provide the browser's native modal API.
    const showModal = vi.fn()
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: showModal,
    })
    const view = mount(CardHand, {
      props: {
        cards: getInvestigatorCards('livia').map((card, index) => ({
          ...card,
          instanceId: `livia:${card.id}:${index}`,
        })),
        ownerLabel: 'Lívia Serrano',
        preparedCardId: null,
        canDiscardPreparedCard: false,
      },
    })
    await view.findAll('.investigation-card')[0]!.trigger('click')
    expect(view.emitted('prepare')).toEqual([['livia:ultraviolet-flashlight:0']])
    expect(showModal).not.toHaveBeenCalled()

    await view.findAll('.card-information')[0]!.trigger('click')
    expect(showModal).toHaveBeenCalledOnce()
    expect(view.get('.card-details').text()).toContain('Durante Examinar um local.')
    expect(view.get('.card-details').text()).toContain('Somente no turno do dono.')
    await view.get('.card-detail-close').trigger('click')
    expect(view.find('.card-details').exists()).toBe(false)
    view.unmount()
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  })

  it('remove a preparação ao clicar novamente na mesma carta', async () => {
    const card = {
      ...getInvestigatorCards('livia')[0]!,
      instanceId: 'livia:ultraviolet-flashlight:0',
    }
    const view = mount(CardHand, {
      props: {
        cards: [card],
        ownerLabel: 'Lívia Serrano',
        preparedCardId: card.instanceId,
        canDiscardPreparedCard: true,
      },
    })

    await view.get('.investigation-card').trigger('click')
    expect(view.emitted('clearPrepared')).toEqual([[]])
  })

  it('descarta uma carta preparada quando a reciclagem está disponível', async () => {
    const card = {
      ...getInvestigatorCards('livia')[0]!,
      instanceId: 'livia:ultraviolet-flashlight:0',
    }
    const view = mount(CardHand, {
      props: {
        cards: [card],
        ownerLabel: 'Lívia Serrano',
        preparedCardId: card.instanceId,
        canDiscardPreparedCard: true,
      },
    })

    await view.get('.discard-card').trigger('click')
    expect(view.emitted('discardPrepared')).toEqual([[]])
  })
})
