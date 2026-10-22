import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInvestigationStore } from './investigation'

describe('seleção da prévia solo', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('mantém investigador e apoio distintos e limpa notas da tentativa anterior', () => {
    const store = useInvestigationStore()
    store.startInvestigation('livia', 'rafael')
    store.notes = 'Uma hipótese anterior'
    store.startInvestigation('isadora', 'otavio')
    expect(store.investigator?.id).toBe('isadora')
    expect(store.support?.id).toBe('otavio')
    expect(store.notes).toBe('')
  })

  it('rejeita usar o investigador ativo como seu próprio apoio', () => {
    const store = useInvestigationStore()
    expect(() => store.startInvestigation('livia', 'livia')).toThrow()
    expect(store.investigatorId).toBeNull()
  })

  it('limpa rascunhos, hipóteses e introdução ao abandonar e permite uma investigação do zero', () => {
    const store = useInvestigationStore()
    store.startInvestigation('livia', 'rafael')
    store.notes = 'Uma hipótese'
    expect(store.saveNote()).toBe(true)
    store.notes = 'Rascunho'
    store.introductionSeen = true
    store.abandonInvestigation()
    expect(store.investigatorId).toBeNull()
    expect(store.notes).toBe('')
    expect(store.hypotheses).toEqual([])
    store.startInvestigation('isadora', 'otavio')
    expect(store.introductionSeen).toBe(false)
    expect(store.hypotheses).toEqual([])
  })

  it('não salva hipóteses vazias ou além do limite', () => {
    const store = useInvestigationStore()
    store.notes = '   '
    expect(store.saveNote()).toBe(false)
    store.notes = 'a'.repeat(4001)
    expect(store.saveNote()).toBe(false)
    expect(store.hypotheses).toEqual([])
  })

  it('não resolve ações localmente quando a API não está conectada', async () => {
    const store = useInvestigationStore()
    store.startInvestigation('livia', 'rafael')
    expect(store.hand).toEqual([])
    expect(store.canExecute('examine')).toBe(false)
    expect(store.executeBasicAction('examine')).toBe(false)
    await expect(store.endRemoteTurn()).rejects.toThrow('conexão ativa')
  })
})
