import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConversationDialog from './ConversationDialog.vue'

describe('ConversationDialog', () => {
  it('mostra as perguntas e informa seus custos antes de resolver uma delas', async () => {
    const view = mount(ConversationDialog, {
      props: {
        pointsLabel: '5 PA gerais',
        conversationCards: [],
        preparedCardId: null,
        conversation: {
          personId: 'marta',
          personName: 'Marta Lobo',
          locationId: 'laboratory',
          questionLimitReached: false,
          questions: [
            {
              id: 'technical-assessment',
              text: 'Como estava a vitrine?',
              cost: 2,
              approach: 'inquiry',
              canResolve: false,
              isEvidenceBlocked: false,
            },
            {
              id: 'davi-interest',
              text: 'Davi procurou você?',
              cost: 1,
              approach: 'context',
              canResolve: true,
              isEvidenceBlocked: false,
            },
          ],
        },
      },
    })

    expect(view.text()).toContain('Marta Lobo')
    expect(view.text()).toContain('5 PA gerais')
    expect(view.text()).toContain('Apuração')
    expect(view.text()).toContain('Contexto')
    expect(view.findAll('.conversation-questions button').map((button) => button.text())).toEqual([
      'ApuraçãoComo estava a vitrine? 2 PA',
      'ContextoDavi procurou você? 1 PA',
    ])
    expect(view.findAll('.conversation-questions button')[0]!.attributes('disabled')).toBeDefined()
    await view.findAll('.conversation-questions button')[1]!.trigger('click')
    expect(view.emitted('resolve')).toEqual([['davi-interest']])
  })

  it('explica quando a pergunta do turno já foi usada', () => {
    const view = mount(ConversationDialog, {
      props: {
        pointsLabel: '3 PA gerais',
        conversationCards: [],
        preparedCardId: null,
        conversation: {
          personId: 'marta',
          personName: 'Marta Lobo',
          locationId: 'laboratory',
          questionLimitReached: true,
          questions: [
            {
              id: 'davi-interest',
              text: 'Davi procurou você?',
              cost: 1,
              approach: 'context',
              canResolve: false,
              isEvidenceBlocked: true,
            },
          ],
        },
      },
    })

    expect(view.text()).toContain('já fez uma pergunta neste turno')
    expect(view.text()).toContain('Diálogo bloqueado: evidência necessária')
    expect(view.text()).not.toContain('Examine a fechadura')
    expect(view.get('.conversation-questions button').attributes('disabled')).toBeDefined()
  })

  it('oferece a Pausa Calculada depois da primeira pergunta do turno', async () => {
    const view = mount(ConversationDialog, {
      props: {
        pointsLabel: '2 PA gerais',
        preparedCardId: null,
        conversationCards: [
          {
            id: 'pocket-recorder',
            name: 'Gravador de Bolso',
            cost: 1,
            image: '',
            effect: '',
            context: '',
            compatibleActions: ['converse'],
            instanceId: 'isadora:pocket-recorder:1',
          },
          {
            id: 'calculated-pause',
            name: 'Pausa Calculada',
            cost: 0,
            image: '',
            effect: '',
            context: '',
            compatibleActions: ['converse'],
            instanceId: 'isadora:calculated-pause:1',
          },
        ],
        conversation: {
          personId: 'marta',
          personName: 'Marta Lobo',
          locationId: 'laboratory',
          questionLimitReached: true,
          questions: [],
        },
      },
    })

    expect(view.text()).toContain('Pausa Calculada')
    expect(view.text()).not.toContain('Gravador de Bolso')
    await view.get('.conversation-cards button').trigger('click')
    expect(view.emitted('prepareCard')).toEqual([['isadora:calculated-pause:1']])
  })
})
