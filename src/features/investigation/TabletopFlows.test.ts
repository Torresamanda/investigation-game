import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { routerKey } from 'vue-router'
import { MatchService } from '../../../backend/application/match-service'
import { InMemoryMatchRepository } from '../../../backend/infrastructure/persistence/in-memory-match-repository'
import { MatchPresenter } from '../../../backend/presenters/match-presenter'
import { useInvestigationStore } from '../../stores/investigation'
import InvestigationView from './InvestigationView.vue'
import type { ConversationOptions, MatchJournalEntry } from '../../services/game-api'

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function setupTable() {
  const session = useInvestigationStore()
  session.startInvestigation('isadora', 'rafael')
  const service = new MatchService(new InMemoryMatchRepository())
  session.remoteMatch = MatchPresenter.toPublicDto(
    service.createSoloMatch({ activeInvestigatorId: 'isadora', supportInvestigatorId: 'rafael' }),
  )
  session.connectionState = 'connected'
  session.introductionSeen = true
  const view = mount(InvestigationView, {
    attachTo: document.body,
    global: { provide: { [routerKey as symbol]: { push: vi.fn() } } },
  })
  return { session, view }
}

const statement: MatchJournalEntry = {
  id: 'new-statement',
  type: 'statement',
  title: 'Declaração',
  content: 'Resposta recém-colhida.',
  locationId: 'gallery',
  round: 1,
  status: 'recorded',
}

it('conversa no painel, atualiza opções ao preparar na mão e mantém a resposta visível', async () => {
  const { session, view } = setupTable()
  const options: ConversationOptions = {
    personId: 'davi',
    personName: 'Davi Orsini',
    locationId: 'gallery',
    questionLimitReached: false,
    questions: [
      {
        id: 'question',
        text: 'O que aconteceu?',
        approach: 'inquiry',
        cost: 1,
        canResolve: true,
        isEvidenceBlocked: false,
      },
    ],
  }
  const load = vi.spyOn(session, 'loadConversationOptions').mockResolvedValue(options)
  vi.spyOn(session, 'prepareCard').mockResolvedValue(true)
  vi.spyOn(session, 'resolveConversation').mockImplementation(async () => {
    session.remoteMatch = { ...session.remoteMatch!, journalEntries: [statement] }
    return statement
  })
  await view.get('.suspect-section > button').trigger('click')
  await flushPromises()
  expect(view.get('.contextual-panel .conversation-dialog').isVisible()).toBe(true)
  expect(view.find('.suspect-profile').exists()).toBe(false)
  await view.get('.hand-panel .investigation-card').trigger('click')
  await flushPromises()
  expect(load).toHaveBeenCalledTimes(2)
  expect(view.find('.conversation-cards').exists()).toBe(false)
  await view.get('.conversation-questions button').trigger('click')
  await flushPromises()
  expect(view.get('.conversation-answer').text()).toContain(statement.content)
  expect(view.get('.discovery-toast').text()).toContain('Declaração')
  expect(view.find('[aria-modal]').exists()).toBe(false)
  view.unmount()
})

it('empilha notificações, distingue observações e zera o badge ao abrir o diário', async () => {
  const { session, view } = setupTable()
  session.remoteMatch = {
    ...session.remoteMatch!,
    journalEntries: [
      statement,
      {
        ...statement,
        id: 'observation',
        type: 'observation',
        status: 'note',
        title: 'Nenhuma descoberta nova',
      },
    ],
  }
  await view.vm.$nextTick()
  expect(view.findAll('.discovery-toast')).toHaveLength(2)
  expect(view.get('.discovery-toast--observation').text()).toContain('Nenhuma descoberta nova:')
  expect(view.get('.journal-unread-count').text()).toBe('1')
  await view.get('.discovery-toast-actions button').trigger('click')
  expect(view.get('#case-journal').isVisible()).toBe(true)
  expect(view.find('.journal-unread-count').exists()).toBe(false)
  await vi.advanceTimersByTimeAsync(6000)
  expect(view.findAll('.discovery-toast')).toHaveLength(0)
  view.unmount()
})

it('mantém o dossiê dentro do painel e permite percorrer o tour sem alterar a partida', async () => {
  const { session, view } = setupTable()
  expect(view.findAll('.mode-tabs button')[2]!.attributes('disabled')).toBeDefined()
  session.remoteMatch = { ...session.remoteMatch!, round: 5, canAccuse: true }
  await view.vm.$nextTick()
  await view.findAll('.mode-tabs button')[2]!.trigger('click')
  expect(view.get('.contextual-panel .accusation-dialog').isVisible()).toBe(true)
  expect(view.find('[aria-modal]').exists()).toBe(false)
  const beforeTour = JSON.stringify(session.remoteMatch)
  await view.findAll('.case-tools button')[0]!.trigger('click')
  for (let step = 1; step <= 5; step++) {
    expect(view.get('.tour-popover').text()).toContain(`Passo ${step} de 5`)
    expect(view.findAll('.tour-highlight')).toHaveLength(1)
    await view.findAll('.tour-popover button')[2]!.trigger('click')
  }
  expect(view.find('.tour-popover').exists()).toBe(false)
  expect(JSON.stringify(session.remoteMatch)).toBe(beforeTour)
  view.unmount()
})
