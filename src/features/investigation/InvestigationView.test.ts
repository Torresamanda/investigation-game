import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import InvestigationView from './InvestigationView.vue'
import { useInvestigationStore } from '../../stores/investigation'

describe('fluxos da investigação', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    useInvestigationStore().startInvestigation('livia', 'rafael')
  })
  afterEach(() => vi.useRealTimers())
  const createView = () =>
    mount(InvestigationView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })

  it('informa que ações exigem uma conexão ativa com a API', async () => {
    const view = createView()
    await view.findAll('.location-list button')[1]!.trigger('click')
    expect(view.get('.scene-panel h2').text()).toBe('Sala de Segurança')
    await view.findAll('.action-grid button')[3]!.trigger('click')
    await flushPromises()
    expect(view.get('.connection-state').text()).toContain('Conecte-se à API')
    view.unmount()
  })

  it('não encerra o turno localmente quando a API está indisponível', async () => {
    const view = createView()
    await view.findAll('.action-grid button')[0]!.trigger('click')
    await flushPromises()
    await view.get('.end-turn').trigger('click')
    await flushPromises()
    expect(view.get('.connection-state').text()).toContain('Conecte-se à API')
    view.unmount()
  })

  it('preserva a seção do diário ao recolher e mantém os mesmos suspeitos do tabuleiro', async () => {
    const view = createView()
    await view.get('.journal-bookmark').trigger('click')
    await view.findAll('.journal-tabs button')[2]!.trigger('click')
    const names = view.findAll('.suspect-name').map((item) => item.text())
    expect(view.findAll('.suspect-list li').map((item) => item.text().trim())).toEqual(names)
    await view.get('.journal-close').trigger('click')
    await view.get('.journal-bookmark').trigger('click')
    expect(view.findAll('.suspect-list li')).toHaveLength(4)
    view.unmount()
  })

  it('mostra as funções dos quatro suspeitos e abre personalidade sem sair do tabuleiro', async () => {
    const view = createView()
    expect(view.findAll('.suspect-tile')).toHaveLength(4)
    expect(view.get('.suspect-roster').text()).toContain('Chefe de segurança')
    await view.findAll('.suspect-tile')[2]!.trigger('click')
    expect(view.get('.suspect-profile').text()).toContain('Marta Lobo')
    expect(view.get('.suspect-profile').text()).toContain('Cuidadosa · Franca')
    expect(view.findAll('.investigation-card')).toHaveLength(0)
    await view.get('.profile-close').trigger('click')
    expect(view.find('.suspect-profile').exists()).toBe(false)
    expect(view.find('.narrator').exists()).toBe(true)
    view.unmount()
  })

  it('permite conversar somente com a pessoa presente no local selecionado', async () => {
    const view = createView()
    const conversationButton = () => view.findAll('.action-grid button')[1]!

    expect(conversationButton().attributes('disabled')).toBeDefined()
    await view.findAll('.suspect-tile')[2]!.trigger('click')
    expect(conversationButton().attributes('disabled')).toBeDefined()
    await view.get('.profile-close').trigger('click')
    await view.findAll('.suspect-tile')[3]!.trigger('click')
    expect(conversationButton().attributes('disabled')).toBeDefined()
    view.unmount()
  })

  it.each([0, 1])(
    'selecionar um local encerra o foco do suspeito, inclusive no mesmo local (%s)',
    async (index) => {
      const view = createView()
      await view.findAll('.suspect-tile')[0]!.trigger('click')
      expect(view.find('.suspect-profile').exists()).toBe(true)
      await view.findAll('.location-list button')[index]!.trigger('click')
      expect(view.find('.suspect-profile').exists()).toBe(false)
      view.unmount()
    },
  )

  it('salva a anotação e a exibe imediatamente nas hipóteses, sem permitir texto vazio', async () => {
    const view = createView()
    await view.get('.journal-bookmark').trigger('click')
    expect(view.get('.save-note').attributes('disabled')).toBeDefined()
    await view.get('#notes').setValue('  Conferir os horários do museu  ')
    await view.get('.journal-notes').trigger('submit')
    expect(view.get('.hypothesis-list').text()).toContain('Conferir os horários do museu')
    expect((view.get('#notes').element as HTMLTextAreaElement).value).toBe('')
    await view.get('.journal-close').trigger('click')
    await view.get('.journal-bookmark').trigger('click')
    expect(view.get('.hypothesis-list').text()).toContain('Conferir os horários do museu')
    view.unmount()
  })

  it('apresenta Sofia no início e fecha a introdução ao entrar no museu', async () => {
    const view = createView()
    expect(view.get('.case-introduction').text()).toContain('Delegada Sofia Moura')
    await view.get('.case-introduction .button-primary').trigger('click')
    expect(view.find('.case-introduction').exists()).toBe(false)
    expect(useInvestigationStore().introductionSeen).toBe(true)
    view.unmount()
  })

  it('abre no hover e fecha ao sair sem permanecer fixado', async () => {
    const view = createView()
    const bookmark = view.get('.journal-bookmark')
    expect(view.find('#case-journal').exists()).toBe(false)
    await bookmark.trigger('mouseenter')
    expect(bookmark.attributes('aria-expanded')).toBe('true')
    await bookmark.trigger('mouseleave')
    await vi.advanceTimersByTimeAsync(200)
    expect(view.find('#case-journal').exists()).toBe(false)
    view.unmount()
  })

  it('fixa por clique, preserva notas ao fechar e permite sair por Escape', async () => {
    const view = createView()
    await view.get('.journal-bookmark').trigger('click')
    await view.get('#notes').setValue('Revisar a cronologia')
    await view.get('#case-journal').trigger('mouseleave')
    await vi.advanceTimersByTimeAsync(200)
    expect(view.find('#case-journal').exists()).toBe(true)
    await view.get('.journal-close').trigger('click')
    expect(view.find('#case-journal').exists()).toBe(false)
    await view.get('.journal-bookmark').trigger('click')
    expect((view.get('#notes').element as HTMLTextAreaElement).value).toBe('Revisar a cronologia')
    await view.get('main').trigger('keydown', { key: 'Escape' })
    expect(view.find('#case-journal').exists()).toBe(false)
    view.unmount()
  })
})
