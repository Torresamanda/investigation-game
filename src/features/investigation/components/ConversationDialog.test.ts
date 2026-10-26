import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConversationDialog from './ConversationDialog.vue'

describe('ConversationDialog', () => {
  it('mostra as perguntas e informa seus custos antes de resolver uma delas', async () => {
    const view = mount(ConversationDialog, {
      props: {
        pointsLabel: '5 PA gerais',
        conversation: {
          personId: 'marta',
          personName: 'Marta Lobo',
          locationId: 'laboratory',
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

  it('explica o bloqueio por evidência sem revelar qual evidência falta', () => {
    const view = mount(ConversationDialog, {
      props: {
        pointsLabel: '3 PA gerais',
        conversation: {
          personId: 'marta',
          personName: 'Marta Lobo',
          locationId: 'laboratory',
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

    expect(view.text()).toContain('Diálogo bloqueado: evidência necessária')
    expect(view.text()).not.toContain('Examine a fechadura')
    expect(view.get('.conversation-questions button').attributes('disabled')).toBeDefined()
  })

  it('exibe a resposta inline e prepara cartas somente na mão principal', () => {
    const view = mount(ConversationDialog, {
      props: {
        pointsLabel: '2 PA gerais',
        answer: 'Declaração recém-colhida.',
        conversation: {
          personId: 'marta',
          personName: 'Marta Lobo',
          locationId: 'laboratory',
          questions: [],
        },
      },
    })
    expect(view.get('.conversation-answer').text()).toContain('Declaração recém-colhida.')
    expect(view.text()).toContain('mão principal')
    expect(view.find('.conversation-cards').exists()).toBe(false)
    expect(view.find('[aria-modal]').exists()).toBe(false)
  })
})
