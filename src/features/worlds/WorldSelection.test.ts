import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import WorldSelection from './WorldSelection.vue'
import { useInvestigationStore } from '../../stores/investigation'
import { gameApi, type RemoteMatch } from '../../services/game-api'

afterEach(() => vi.restoreAllMocks())

it('mantém apoio distinto ao trocar investigador e usa a seleção ao iniciar a prévia', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: WorldSelection },
      { path: '/investigacao', name: 'investigation', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  const view = mount(WorldSelection, { global: { plugins: [pinia, router] } })
  await view.findAll('.investigator-option')[1]!.trigger('click')
  expect((view.get('#support').element as HTMLSelectElement).value).toBe('livia')
  expect(
    view
      .get('#support')
      .findAll('option')
      .map((item) => item.attributes('value')),
  ).not.toContain('rafael')
  await view.get('.button-primary').trigger('click')
  await flushPromises()
  expect(useInvestigationStore().investigatorId).toBe('rafael')
  expect(useInvestigationStore().supportId).toBe('livia')
  expect(router.currentRoute.value.name).toBe('investigation')
  view.unmount()
})

it('mostra a conexão em andamento e impede iniciar duas partidas ao mesmo tempo', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: WorldSelection },
      { path: '/investigacao', name: 'investigation', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  let rejectRequest: ((reason: Error) => void) | undefined
  const pendingMatch = new Promise<RemoteMatch>((_resolve, reject) => {
    rejectRequest = reject
  })
  const createMatch = vi.spyOn(gameApi, 'createMatch').mockReturnValue(pendingMatch)
  const view = mount(WorldSelection, { global: { plugins: [pinia, router] } })

  await view.get('.button-primary').trigger('click')
  expect(view.get('.button-primary').attributes('disabled')).toBeDefined()
  expect(view.get('[role="status"]').text()).toContain('Conectando ao servidor')
  await view.get('.button-primary').trigger('click')
  expect(createMatch).toHaveBeenCalledOnce()

  rejectRequest?.(new Error('Servidor indisponível.'))
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('investigation')
  expect(useInvestigationStore().connectionState).toBe('error')
  createMatch.mockRestore()
  view.unmount()
})
