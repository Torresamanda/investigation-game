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

  it('organiza cenário, personagens, mão e investigação em seções independentes', async () => {
    const view = createView()
    const layout = view.get('.investigation-layout')

    expect(layout.find('.locations-panel').exists()).toBe(true)
    expect(layout.find('.scene-panel').exists()).toBe(true)
    expect(layout.find('.suspect-section').exists()).toBe(true)
    expect(layout.find('.hand-panel').exists()).toBe(true)
    expect(layout.find('.investigation-controls').exists()).toBe(true)
    expect(layout.get('.investigator-points').text()).toContain('PA disponíveis')
    expect(layout.find('.hand-points').exists()).toBe(false)
    expect(layout.find('.scene-panel .suspect-section').exists()).toBe(false)
    expect(layout.find('.scene-panel .investigation-controls').exists()).toBe(false)

    await view.get('.journal-bookmark').trigger('click')
    expect(layout.find('.journal-panel').exists()).toBe(true)
    view.unmount()
  })

  it('mantém as ações de descarte junto às cartas sem texto auxiliar', () => {
    const view = createView()

    expect(view.find('.hand-hint').exists()).toBe(false)
    expect(view.get('.hand-actions .discard-card').attributes('disabled')).toBeDefined()
    view.unmount()
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

  it('mostra o estado do servidor e permite tentar recuperar a conexão', async () => {
    const session = useInvestigationStore()
    session.connectionState = 'error'
    session.connectionError = 'Conexão interrompida.'
    const retryConnection = vi.spyOn(session, 'retryConnection').mockResolvedValue()
    const view = createView()

    expect(view.get('.connection-state').attributes('role')).toBe('alert')
    expect(view.get('.connection-state').text()).toContain('API indisponível')
    await view.get('.connection-state button').trigger('click')
    await flushPromises()

    expect(retryConnection).toHaveBeenCalledOnce()
    view.unmount()
  })

  it('bloqueia novas ações durante uma requisição sem inserir aviso transitório no layout', async () => {
    const session = useInvestigationStore()
    const view = createView()
    const layout = view.get('.investigation-layout').element

    session.isRequestPending = true
    await view.vm.$nextTick()

    expect(view.find('.connection-state').exists()).toBe(false)
    expect(view.get('.investigation-layout').element).toBe(layout)
    expect(
      view
        .findAll('.action-grid button')
        .every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)
    expect(
      view
        .findAll('.location-list button')
        .every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)
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
    expect(view.findAll('.suspect-tile')[3]!.attributes('aria-pressed')).toBe('true')
    expect(view.findAll('.suspect-roster .suspect-presence')).toHaveLength(0)
    expect(view.get('.suspect-profile').text()).toContain('Davi Orsini')
    expect(view.get('.suspect-profile .suspect-presence').text()).toBe('Presente neste local')
    await view.findAll('.suspect-tile')[2]!.trigger('click')
    expect(view.get('.suspect-profile').text()).toContain('Marta Lobo')
    expect(view.get('.suspect-profile').text()).toContain('Cuidadosa · Franca')
    expect(view.findAll('.investigation-card')).toHaveLength(0)
    expect(view.find('.narrator').exists()).toBe(true)
    expect(view.find('.profile-close').exists()).toBe(false)
    view.unmount()
  })

  it('permite conversar somente com a pessoa presente no local selecionado', async () => {
    const view = createView()
    const conversationButton = () => view.findAll('.action-grid button')[1]!

    expect(conversationButton().attributes('disabled')).toBeDefined()
    await view.findAll('.suspect-tile')[2]!.trigger('click')
    expect(conversationButton().attributes('disabled')).toBeDefined()
    await view.findAll('.suspect-tile')[3]!.trigger('click')
    expect(conversationButton().attributes('disabled')).toBeDefined()
    view.unmount()
  })

  it.each([
    { locationIndex: 0, suspectIndex: 3, suspectName: 'Davi Orsini' },
    { locationIndex: 1, suspectIndex: 1, suspectName: 'Raul Viana' },
  ])(
    'selecionar um cenário ativa a pessoa correspondente (%s)',
    async ({ locationIndex, suspectIndex, suspectName }) => {
      const view = createView()
      await view.findAll('.suspect-tile')[0]!.trigger('click')
      await view.findAll('.location-list button')[locationIndex]!.trigger('click')
      expect(view.get('.suspect-profile').text()).toContain(suspectName)
      expect(view.findAll('.suspect-tile')[suspectIndex]!.attributes('aria-pressed')).toBe('true')
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
