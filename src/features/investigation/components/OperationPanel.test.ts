import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OperationPanel from './OperationPanel.vue'

describe('OperationPanel', () => {
  it('communicates the final-round recovery window without a solution hint', () => {
    const view = mount(OperationPanel, {
      props: { operations: [], hypotheses: [], isPrepared: false, isFinalRound: true },
    })

    expect(view.text()).toContain('No prazo final')
    expect(view.text()).toContain('confirmar informações já encontradas')
    expect(view.text()).not.toContain('local')
    expect(view.text()).not.toContain('pista que falta')
  })

  it('presents an available operation as a narrative decision', async () => {
    const view = mount(OperationPanel, {
      props: {
        isFinalRound: false,
        isPrepared: false,
        hypotheses: [],
        operations: [
          {
            id: 'preserve-the-evidence',
            kind: 'closure',
            title: 'Preservar a prova',
            riskDescription: 'Pode revelar uma inconsistência.',
          },
        ],
      },
    })

    await view.get('.button-primary').trigger('click')

    expect(view.emitted('prepare')).toEqual([['preserve-the-evidence']])
  })

  it('orienta o próximo avanço sem indicar pistas, eixos ou locais específicos', () => {
    const view = mount(OperationPanel, {
      props: {
        operations: [],
        hypotheses: [
          { status: 'inquiry', evidenceEntryIds: [], coveredAxes: [], coherentRelationCount: 0 },
        ],
        isPrepared: false,
        isFinalRound: false,
      },
    })

    expect(view.get('.operation-readiness').text()).toContain('Em apuração')
    expect(view.text()).toContain('Registre evidências e estabeleça relações coerentes')
    expect(view.text()).not.toMatch(/galeria|segurança|pessoa|carta|eixo/i)
  })

  it('diferencia visualmente os estados das linhas de raciocínio', () => {
    const statuses = ['inquiry', 'plausible', 'sustained', 'contested'] as const
    const view = mount(OperationPanel, {
      props: {
        operations: [],
        hypotheses: statuses.map((status) => ({
          status,
          evidenceEntryIds: [],
          coveredAxes: [],
          coherentRelationCount: 0,
        })),
        isPrepared: false,
        isFinalRound: false,
      },
    })

    for (const status of statuses)
      expect(view.find(`.journal-status--${status}`).exists()).toBe(true)
    expect(view.text()).toContain('Em apuração')
    expect(view.text()).toContain('Plausível')
    expect(view.text()).toContain('Sustentada')
    expect(view.text()).toContain('Contestada')
  })

  it('explica quando verificação e encerramento estão disponíveis', () => {
    const view = mount(OperationPanel, {
      props: {
        operations: [
          {
            id: 'verify-the-theory',
            kind: 'verify',
            title: 'Verificar a linha de raciocínio',
            riskDescription: 'Pode revelar uma inconsistência.',
          },
          {
            id: 'preserve-the-evidence',
            kind: 'closure',
            title: 'Preservar a prova',
            riskDescription: 'Pode revelar uma inconsistência.',
          },
        ],
        hypotheses: [
          { status: 'sustained', evidenceEntryIds: [], coveredAxes: [], coherentRelationCount: 2 },
        ],
        isPrepared: false,
        isFinalRound: false,
      },
    })

    expect(view.text()).toContain('Verificação disponível')
    expect(view.text()).toContain('Encerramento disponível')
    expect(view.text()).not.toContain('evidência que falta')
  })
})
