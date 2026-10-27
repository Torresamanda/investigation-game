import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OperationPanel from './OperationPanel.vue'

describe('OperationPanel', () => {
  it('communicates the final-round recovery window without a solution hint', () => {
    const view = mount(OperationPanel, {
      props: { operations: [], isPrepared: false, isFinalRound: true },
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
})
