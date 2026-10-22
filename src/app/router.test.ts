import { expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from './router'
import { useInvestigationStore } from '../stores/investigation'

it('sair para o mundo não apaga a sessão automaticamente', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  setActivePinia(createPinia())
  const store = useInvestigationStore()
  const router = createAppRouter(createMemoryHistory())
  await router.push('/')
  store.startInvestigation('livia', 'rafael')
  await router.push('/investigacao')
  store.notes = 'Conferir horários'
  store.saveNote()
  await router.push('/')
  expect(store.investigatorId).toBe('livia')
  expect(store.hypotheses).toEqual([{ id: 1, text: 'Conferir horários' }])
  await router.push('/investigacao')
  expect(router.currentRoute.value.path).toBe('/investigacao')
  vi.restoreAllMocks()
}, 10_000)
