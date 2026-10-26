import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { routerKey } from 'vue-router'
import InvestigationView from './InvestigationView.vue'
import { useInvestigationStore } from '../../stores/investigation'

describe('fluxos da investigação', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    setActivePinia(createPinia())
    useInvestigationStore().startInvestigation('livia', 'rafael')
  })
  afterEach(() => vi.useRealTimers())
  const createView = () =>
    mount(InvestigationView, {
      attachTo: document.body,
      global: {
        provide: { [routerKey as symbol]: { push: vi.fn() } },
        stubs: { RouterLink: { template: '<a><slot /></a>' } },
      },
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

  it('bloqueia a interação sem alterar a aparência dos botões durante uma requisição', async () => {
    const session = useInvestigationStore()
    const view = createView()
    const layout = view.get('.investigation-layout').element

    session.isRequestPending = true
    await view.vm.$nextTick()

    expect(view.find('.connection-state').exists()).toBe(false)
    expect(view.get('.investigation-layout').element).toBe(layout)
    expect(view.get('main').attributes('inert')).toBeDefined()
    expect(view.get('main').attributes('aria-busy')).toBe('true')
    expect(view.findAll('.location-list button')[0]!.attributes('disabled')).toBeUndefined()
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

  it('exibe conexões na terceira seção do diário', async () => {
    const view = createView()
    await view.get('.journal-bookmark').trigger('click')
    await view.findAll('.journal-tabs button')[2]!.trigger('click')
    expect(view.get('.journal-connection-form').text()).toContain('Criar conexão formal')
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
    expect(view.get('.tour-popover').text()).toContain('Passo 1 de 5')
    view.unmount()
  })

  it('não repete a introdução nem o tour após a primeira entrada e permite reabrir pelo botão', async () => {
    const firstView = createView()
    await firstView.get('.case-introduction .button-primary').trigger('click')
    firstView.unmount()

    const secondView = createView()
    expect(secondView.find('.case-introduction').exists()).toBe(false)
    expect(secondView.find('.tour-popover').exists()).toBe(false)
    await secondView.get('.tour-trigger').trigger('click')
    expect(secondView.get('.tour-popover').text()).toContain('Passo 1 de 5')
    secondView.unmount()
  })

  it('alterna o painel por abas sem hover, modal ou alteração das zonas', async () => {
    const view = createView()
    const zones = view.get('.investigation-layout').element.children
    expect(zones).toHaveLength(3)
    const center = zones[1]
    const bookmark = view.get('.journal-bookmark')
    expect(view.get('#case-journal').isVisible()).toBe(false)
    await bookmark.trigger('mouseenter')
    expect(view.get('#case-journal').isVisible()).toBe(false)
    await bookmark.trigger('click')
    expect(view.get('#case-journal').isVisible()).toBe(true)
    await view.get('#notes').setValue('Revisar a cronologia')
    await view.get('.mode-tabs button').trigger('click')
    expect(view.get('#case-journal').isVisible()).toBe(false)
    await bookmark.trigger('click')
    expect((view.get('#notes').element as HTMLTextAreaElement).value).toBe('Revisar a cronologia')
    expect(zones[1]).toBe(center)
    expect(view.find('[aria-modal]').exists()).toBe(false)
    view.unmount()
  })
})
