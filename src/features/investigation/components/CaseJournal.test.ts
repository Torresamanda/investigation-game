import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CaseJournal from './CaseJournal.vue'

const journalEntries = [
  {
    id: 'clue-13',
    type: 'clue' as const,
    title: 'Exclusão de registros',
    content: 'A lacuna foi criada às 22h13.',
    locationId: 'security' as const,
    round: 3,
    status: 'confirmed' as const,
  },
  {
    id: 'clue-16',
    type: 'clue' as const,
    title: 'Retorno do cartão',
    content: 'O cartão retorna às 22h16.',
    locationId: 'security' as const,
    round: 4,
    status: 'unconfirmed' as const,
  },
  {
    id: 'observation',
    type: 'observation' as const,
    title: 'Sem nova descoberta',
    content: 'A ação não revelou informação nova.',
    locationId: 'gallery' as const,
    round: 2,
    status: 'note' as const,
  },
  {
    id: 'statement',
    type: 'statement' as const,
    title: 'Declaração de Raul',
    content: 'Eu estava na sala.',
    locationId: 'security' as const,
    round: 4,
    status: 'contestable' as const,
  },
  {
    id: 'connection',
    type: 'observation' as const,
    title: 'Conexão formal',
    content: 'Duas pistas se relacionam.',
    locationId: 'security' as const,
    round: 5,
    status: 'note' as const,
    relatedEntryIds: ['clue-13', 'clue-16'],
  },
]

function mountJournal(tab: 'timeline' | 'clues' = 'clues') {
  return mount(CaseJournal, {
    props: {
      notes: '',
      tab,
      hypotheses: [],
      journalEntries,
      'onUpdate:notes': () => undefined,
      'onUpdate:tab': () => undefined,
    },
    global: { stubs: { PhUserFocus: true, PhX: true } },
  })
}

describe('CaseJournal', () => {
  it('separa pistas, observações, declarações e conexões com estado, origem e rodada', () => {
    const view = mountJournal()
    const groups = view.findAll('.journal-group')

    expect(groups.map((group) => group.find('h4').text())).toEqual([
      'Pistas',
      'Observações',
      'Declarações',
      'Conexões',
    ])
    expect(groups[0]!.text()).toContain('Confirmada')
    expect(groups[0]!.text()).toContain('Sala de Segurança · Rodada 3')
    expect(groups[1]!.text()).toContain('Sem nova descoberta')
    expect(groups[2]!.text()).toContain('Contestável')
    expect(groups[3]!.text()).toContain('Conexão formal')
    expect(groups[0]!.text()).not.toContain('Conexão formal')
  })

  it('inclui horários na cronologia somente quando aparecem nos registros descobertos', () => {
    const view = mountJournal('timeline')

    expect(view.text()).toContain('22h13')
    expect(view.text()).toContain('22h16')
    expect(view.findAll('.timeline-entry').map((entry) => entry.find('strong').text())).toEqual([
      '22h13',
      '22h14',
      '22h16',
      '22h21',
    ])
  })
})
