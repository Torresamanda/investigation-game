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
    expect(view.find('dialog').exists()).toBe(true)
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

  it('mostra somente o ícone de descarte quando as ações estão compactas', () => {
    const view = mount(CardHand, {
      props: {
        cards: [],
        ownerLabel: 'Lívia Serrano',
        preparedCardId: null,
        canDiscardPreparedCard: false,
        compactActions: true,
      },
      global: { stubs: { PhTrash: true } },
    })

    expect(view.get('.discard-card').attributes('aria-label')).toBe('Descartar carta')
    expect(view.find('.discard-label').exists()).toBe(false)
  })
})

it('separa várias temporárias e apoio sem sobrepor controles às cartas', () => {
  const regular = getInvestigatorCards('livia').map((card, index) => ({
    ...card,
    instanceId: 'regular-' + index,
    ownerId: 'livia' as const,
  }))
  const extras = [
    { ...regular[0]!, instanceId: 'temporary-1', temporary: true },
    { ...regular[1]!, instanceId: 'temporary-2', temporary: true },
    { ...regular[2]!, instanceId: 'support-1', ownerId: 'rafael' as const },
  ]
  const view = mount(CardHand, {
    props: {
      cards: [...regular, ...extras],
      ownerId: 'livia',
      ownerLabel: 'Lívia',
      preparedCardId: 'temporary-1',
      canDiscardPreparedCard: true,
    },
  })
  const groups = view.findAll('.card-group')
  expect(groups[0]!.findAll('.investigation-card')).toHaveLength(4)
  expect(groups[1]!.findAll('.investigation-card')).toHaveLength(3)
  expect(groups[1]!.text()).toContain('Temp')
  expect(groups[1]!.text()).toContain('Apoio')
  expect(groups[1]!.findAll('.investigation-card-shell--extra')).toHaveLength(3)
  expect(view.get('.hand-heading .hand-actions').text()).toContain('Cancelar preparação')
  expect(view.find('.hand-groups .hand-actions').exists()).toBe(false)
})
