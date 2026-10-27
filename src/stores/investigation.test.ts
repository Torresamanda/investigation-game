import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInvestigationStore } from './investigation'
import { gameApi, type RemoteMatch } from '../services/game-api'

describe('seleção da prévia solo', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

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

  it('mantém a introdução vista ao abandonar e iniciar outra investigação', () => {
    const store = useInvestigationStore()
    store.startInvestigation('livia', 'rafael')
    store.notes = 'Uma hipótese'
    expect(store.saveNote()).toBe(true)
    store.notes = 'Rascunho'
    store.markIntroductionAsSeen()
    store.abandonInvestigation()
    expect(store.investigatorId).toBeNull()
    expect(store.notes).toBe('')
    expect(store.hypotheses).toEqual([])
    store.startInvestigation('isadora', 'otavio')
    expect(store.introductionSeen).toBe(true)
    expect(store.hypotheses).toEqual([])
  })

  it('recupera a introdução vista após recriar o estado da partida', () => {
    const store = useInvestigationStore()
    store.markIntroductionAsSeen()
    setActivePinia(createPinia())

    expect(useInvestigationStore().introductionSeen).toBe(true)
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

  it('sinaliza uma solicitação em andamento, bloqueia duplicatas e permite tentar de novo', async () => {
    const store = useInvestigationStore()
    store.startInvestigation('livia', 'rafael')
    let rejectRequest: ((reason: Error) => void) | undefined
    const pendingMatch = new Promise<RemoteMatch>((_resolve, reject) => {
      rejectRequest = reject
    })
    const createMatch = vi
      .spyOn(gameApi, 'createMatch')
      .mockReturnValueOnce(pendingMatch)
      .mockRejectedValueOnce(new Error('Servidor indisponível.'))

    const firstRequest = store.createRemoteMatch('livia', 'rafael')
    expect(store.isRequestPending).toBe(true)
    await expect(store.retryConnection()).rejects.toThrow('Aguarde a solicitação atual terminar.')
    expect(createMatch).toHaveBeenCalledOnce()

    rejectRequest?.(new Error('Conexão interrompida.'))
    await expect(firstRequest).rejects.toThrow('Conexão interrompida.')
    expect(store.isRequestPending).toBe(false)
    expect(store.connectionState).toBe('error')
    expect(store.connectionError).toBe('Conexão interrompida.')

    await expect(store.retryConnection()).rejects.toThrow('Servidor indisponível.')
    expect(createMatch).toHaveBeenCalledTimes(2)
    expect(store.isRequestPending).toBe(false)
    createMatch.mockRestore()
  })

  it('restabelece o estado da partida ao verificar novamente a conexão', async () => {
    const store = useInvestigationStore()
    store.startInvestigation('livia', 'rafael')
    store.remoteMatch = {
      id: 'match-01',
      mode: 'solo',
      createdAt: '2026-10-23T12:00:00.000Z',
      preparedCardInstanceId: null,
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
      round: 1,
      status: 'active',
      examinedLocationsThisRound: [],
      hasUsedPassiveThisRound: false,
      hasReceivedSocialBonusThisRound: false,
      hasUsedPressLeakConversationThisRound: false,
      hasFreeConnectionThisRound: false,
      hasUsedFreeConnectionThisRound: false,
      canCreateInvestigatorConnection: false,
      currentLocationId: 'gallery',
      unlockedLocations: ['gallery', 'security', 'laboratory', 'office'],
      hasUsedFreeMoveThisRound: false,
      hasDiscardedCardThisRound: false,
      hasUsedSupportThisRound: false,
      actionPoints: { general: 5, specialty: 0, specialtyPoint: null },
      journalEntries: [],
      journalConnections: [],
      decks: { livia: { hand: [], drawPileCount: 4, discardPileCount: 0 } },
    }
    store.connectionState = 'error'
    store.connectionError = 'Conexão interrompida.'
    const refreshedMatch = { ...store.remoteMatch, round: 2 }
    const getMatch = vi.spyOn(gameApi, 'getMatch').mockResolvedValue(refreshedMatch)

    await store.retryConnection()

    expect(getMatch).toHaveBeenCalledWith('match-01')
    expect(store.remoteMatch?.round).toBe(2)
    expect(store.connectionState).toBe('connected')
    expect(store.connectionError).toBeNull()
    expect(store.isRequestPending).toBe(false)
    getMatch.mockRestore()
  })

  it('retoma uma partida remota com a equipe persistida no servidor', async () => {
    const store = useInvestigationStore()
    const restoredMatch: RemoteMatch = {
      id: 'match-02',
      mode: 'solo',
      createdAt: '2026-10-23T12:00:00.000Z',
      preparedCardInstanceId: null,
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'otavio',
      round: 2,
      status: 'active',
      examinedLocationsThisRound: [],
      hasUsedPassiveThisRound: false,
      hasReceivedSocialBonusThisRound: false,
      hasUsedPressLeakConversationThisRound: false,
      hasFreeConnectionThisRound: false,
      hasUsedFreeConnectionThisRound: false,
      canCreateInvestigatorConnection: false,
      currentLocationId: 'gallery',
      unlockedLocations: ['gallery', 'security', 'laboratory', 'office'],
      hasUsedFreeMoveThisRound: false,
      hasDiscardedCardThisRound: false,
      hasUsedSupportThisRound: false,
      actionPoints: { general: 4, specialty: 0, specialtyPoint: null },
      journalEntries: [],
      journalConnections: [],
      decks: { isadora: { hand: [], drawPileCount: 4, discardPileCount: 0 } },
    }
    const getMatch = vi.spyOn(gameApi, 'getMatch').mockResolvedValue(restoredMatch)

    await store.resumeRemoteMatch(restoredMatch.id)

    expect(store.investigatorId).toBe('isadora')
    expect(store.supportId).toBe('otavio')
    expect(store.remoteMatch).toStrictEqual(restoredMatch)
    expect(store.connectionState).toBe('connected')
    getMatch.mockRestore()
  })
})
