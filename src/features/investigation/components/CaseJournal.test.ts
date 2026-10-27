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

function mountJournal() {
  return mount(CaseJournal, {
    props: {
      notes: '',
      hypotheses: [],
      journalEntries,
      muralLinks: [{ id: 'formal-1', fromClueId: 'clue-13', toClueId: 'clue-16', round: 5 }],
      investigativeCrossingCost: 1,
      canAffordInvestigativeCrossing: true,
      'onUpdate:notes': () => undefined,
    },
    global: { stubs: { PhUserFocus: true, PhX: true } },
  })
}

describe('CaseJournal', () => {
  it('mantém o diário aberto pela aba contextual, sem um botão de fechar redundante', () => {
    const view = mountJournal()

    expect(view.find('.journal-close').exists()).toBe(false)
  })

  it('explica pistas, conexões, hipóteses e operações com regras neutras', () => {
    const guide = mountJournal().get('.journal-guide')

    expect(guide.text()).toContain('Pista')
    expect(guide.text()).toContain('Conexão')
    expect(guide.text()).toContain('A ligação no mural registra uma associação sem custo')
    expect(guide.text()).toContain('Hipótese')
    expect(guide.text()).toContain('Operação')
    expect(guide.text()).not.toContain('Galeria')
    expect(guide.text()).not.toContain('suspeito')
  })

  it('reúne pistas, observações, declarações e conexões em cartões com estado e origem', () => {
    const view = mountJournal()
    const records = view.findAll('.journal-record-list .journal-entry')

    expect(view.find('.journal-tabs').exists()).toBe(false)
    expect(records).toHaveLength(6)
    expect(records[0]!.text()).toContain('Confirmada')
    expect(records[0]!.text()).toContain('Sala de Segurança · Rodada 3')
    expect(records[2]!.text()).toContain('Sem nova descoberta')
    expect(records[3]!.text()).toContain('Contestável')
    expect(records[5]!.text()).toContain('Exclusão de registros se relaciona a Retorno do cartão')
  })

  it('substitui o estado vazio pelos registros quando eles chegam depois da abertura do diário', async () => {
    const view = mount(CaseJournal, {
      props: {
        notes: '',
        hypotheses: [],
        journalEntries: [],
        muralLinks: [],
        investigativeCrossingCost: 1,
        canAffordInvestigativeCrossing: false,
        'onUpdate:notes': () => undefined,
      },
      global: { stubs: { PhUserFocus: true, PhX: true } },
    })

    expect(view.text()).toContain('Nenhum registro no diário ainda.')

    await view.setProps({ journalEntries })

    expect(view.text()).not.toContain('Nenhum registro no diário ainda.')
  })

  it('mantém o mural visível sem recolher a organização da investigação', () => {
    const view = mountJournal()

    expect(view.text()).toContain('22h13')
    expect(view.text()).toContain('22h16')
    expect(view.find('.journal-details').exists()).toBe(false)
    expect(view.get('.investigation-mural').text()).toContain('Mural de investigação')
  })

  it('mostra progresso de hipótese sem indicar a evidência ou o local que falta', async () => {
    const view = mountJournal()

    await view.setProps({
      hypothesisProgress: [
        {
          status: 'plausible',
          evidenceEntryIds: ['clue-13'],
          coveredAxes: ['means', 'link'],
          coherentRelationCount: 1,
        },
      ],
    })

    expect(view.text()).toContain('Linha de raciocínio 1')
    expect(view.text()).toContain('Plausível')
    expect(view.text()).toContain('2 aspecto(s) investigativo(s) confirmado(s)')
    expect(view.text()).toContain('Exclusão de registros')
    expect(view.text()).not.toContain('Oportunidade')
  })
})
