import { expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from './router'
import { useInvestigationStore } from '../stores/investigation'

it('abandonar pelo mundo apaga a sessão e impede retomada pelo histórico', async () => {
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
  expect(store.investigatorId).toBeNull()
  expect(store.hypotheses).toEqual([])
  await router.push('/investigacao')
  expect(router.currentRoute.value.path).toBe('/')
  vi.restoreAllMocks()
})
