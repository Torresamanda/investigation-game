import { expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import WorldSelection from './WorldSelection.vue'
import { useInvestigationStore } from '../../stores/investigation'

it('mantém apoio distinto ao trocar investigador e usa a seleção ao iniciar a prévia', async () => {
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
