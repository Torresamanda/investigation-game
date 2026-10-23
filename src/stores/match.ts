import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { investigators, type InvestigatorId } from '../content/investigators'
import { getCardDefinition, type CardDefinition } from '../content/cards'
import type { InvestigationAction, LocationId, PersonId } from '../../shared/domain/identifiers'
import { canPayAction, investigatorActionCost } from '../../shared/domain/action-points'
import {
  gameApi,
  ApiRequestError,
  type AccusationSubmission,
  type MatchJournalEntry,
  type RemoteMatch,
} from '../services/game-api'

export interface HandCard extends CardDefinition {
  readonly instanceId: string
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

export const useMatchStore = defineStore('match', () => {
  const investigatorId = ref<InvestigatorId | null>(null)
  const supportId = ref<InvestigatorId | null>(null)
  const introductionSeen = ref(false)
  const remoteMatch = ref<RemoteMatch | null>(null)
  const preparedCardId = ref<string | null>(null)
  const connectionState = ref<ConnectionState>('idle')
  const connectionError = ref<string | null>(null)
  const isRequestPending = ref(false)

  async function performApiRequest<T>(request: () => Promise<T>): Promise<T> {
    if (isRequestPending.value) throw new Error('Aguarde a solicitação atual terminar.')

    isRequestPending.value = true
    connectionError.value = null
    try {
      const result = await request()
      connectionState.value = 'connected'
      return result
    } catch (error) {
      const isServerUnavailable = !(error instanceof ApiRequestError) || error.statusCode >= 500
      if (isServerUnavailable || !remoteMatch.value) {
        connectionState.value = 'error'
        connectionError.value = error instanceof Error ? error.message : 'A API está indisponível.'
      } else {
        connectionState.value = 'connected'
      }
      throw error
    } finally {
      isRequestPending.value = false
    }
  }

  const investigator = computed(() =>
    investigators.find((item) => item.id === investigatorId.value),
  )
  const support = computed(() => investigators.find((item) => item.id === supportId.value))
  const hand = computed<readonly HandCard[]>(() => {
    const activeId = investigatorId.value
    const remoteHand = activeId ? remoteMatch.value?.decks[activeId]?.hand : undefined
    if (!remoteHand) return []
    return remoteHand.flatMap((card) => {
      const definition = getCardDefinition(card.definitionId)
      return definition ? [{ ...definition, cost: card.cost, instanceId: card.instanceId }] : []
    })
  })
  const round = computed(() => remoteMatch.value?.round ?? 1)
  const currentLocationId = computed(() => remoteMatch.value?.currentLocationId ?? 'gallery')
  const unlockedLocations = computed<readonly LocationId[]>(
    () => remoteMatch.value?.unlockedLocations ?? ['gallery', 'security', 'laboratory', 'office'],
  )
  const moveCostLabel = computed(() =>
    remoteMatch.value?.hasUsedFreeMoveThisRound ? '1 PA' : 'Grátis (1º da rodada)',
  )
  const pointsLabel = computed(() => {
    const points = remoteMatch.value?.actionPoints
    if (!points) return ''
    if (!points.specialty) return `${points.general} PA gerais`
    const specialtyLabel =
      points.specialtyPoint === 'technical'
        ? 'técnico'
        : points.specialtyPoint === 'social'
          ? 'social'
          : 'de pesquisa'
    return `${points.general} PA gerais + ${points.specialty} ${specialtyLabel}`
  })
  const canDiscardPreparedCard = computed(
    () => Boolean(preparedCard.value) && !remoteMatch.value?.hasDiscardedCardThisRound,
  )
  const canEndTurn = computed(() => remoteMatch.value?.status === 'active' && round.value <= 6)
  const hasUsedSupportThisRound = computed(
    () => remoteMatch.value?.hasUsedSupportThisRound ?? false,
  )
  const canAccuse = computed(
    () =>
      remoteMatch.value?.status === 'active' &&
      remoteMatch.value.canAccuse &&
      round.value >= 5 &&
      round.value <= 6,
  )
  const preparedCard = computed(() =>
    hand.value.find(
      (card) =>
        card.instanceId === (remoteMatch.value?.preparedCardInstanceId ?? preparedCardId.value),
    ),
  )
  const journalEntries = computed<readonly MatchJournalEntry[]>(
    () => remoteMatch.value?.journalEntries ?? [],
  )

  function startInvestigation(active: InvestigatorId, support: InvestigatorId): void {
    if (isRequestPending.value) throw new Error('Aguarde a solicitação atual terminar.')
    if (active === support) throw new Error('O apoio deve ser outro investigador.')
    investigatorId.value = active
    supportId.value = support
    introductionSeen.value = false
    remoteMatch.value = null
    preparedCardId.value = null
    connectionState.value = 'idle'
    connectionError.value = null
  }

  function actionCost(
    action: InvestigationAction,
    locationId: LocationId = currentLocationId.value,
  ): number {
    if (!remoteMatch.value || !investigatorId.value) return 2
    const card = preparedCard.value
    return investigatorActionCost({
      investigatorId: investigatorId.value,
      action,
      locationId,
      examinedLocationsThisRound: remoteMatch.value.examinedLocationsThisRound,
      preparedCardCost: card?.cost ?? 0,
      preparedCardId: card?.id,
      hasMarkedClueForFollowUp: remoteMatch.value.journalEntries.some(
        (entry) =>
          entry.type === 'clue' &&
          entry.locationId === locationId &&
          (entry.status === 'unconfirmed' || entry.status === 'indicio') &&
          entry.markedForFollowUp === true,
      ),
    })
  }

  function canExecute(
    action: InvestigationAction,
    locationId: LocationId = currentLocationId.value,
  ): boolean {
    if (!remoteMatch.value || remoteMatch.value.status !== 'active') return false
    const card = preparedCard.value
    if (card && !card.compatibleActions.includes(action)) return false
    return canPayAction(remoteMatch.value.actionPoints, {
      action,
      amount: actionCost(action, locationId),
    })
  }

  async function createRemoteMatch(active: InvestigatorId, support: InvestigatorId) {
    if (isRequestPending.value) throw new Error('Aguarde a solicitação atual terminar.')
    connectionState.value = 'connecting'
    connectionError.value = null
    remoteMatch.value = await performApiRequest(() => gameApi.createMatch(active, support))
    investigatorId.value = active
    supportId.value = support
    connectionState.value = 'connected'
    return remoteMatch.value
  }

  async function resumeRemoteMatch(matchId: string): Promise<RemoteMatch> {
    const restoredMatch = await performApiRequest(() => gameApi.getMatch(matchId))
    remoteMatch.value = restoredMatch
    investigatorId.value = restoredMatch.activeInvestigatorId
    supportId.value = restoredMatch.supportInvestigatorId
    preparedCardId.value = restoredMatch.preparedCardInstanceId
    return restoredMatch
  }

  async function retryConnection(): Promise<void> {
    if (remoteMatch.value) {
      remoteMatch.value = await performApiRequest(() => gameApi.getMatch(remoteMatch.value!.id))
      preparedCardId.value = remoteMatch.value.preparedCardInstanceId
      return
    }

    const active = investigatorId.value
    const support = supportId.value
    if (!active || !support) throw new Error('Escolha a equipe antes de iniciar a investigação.')
    await createRemoteMatch(active, support)
  }

  async function prepareCard(instanceId: string): Promise<boolean> {
    if (!remoteMatch.value || !hand.value.some((card) => card.instanceId === instanceId))
      return false
    remoteMatch.value = await performApiRequest(() =>
      gameApi.prepareCard(remoteMatch.value!.id, instanceId),
    )
    preparedCardId.value = instanceId
    return true
  }

  async function clearPreparedCard(): Promise<void> {
    if (!remoteMatch.value) throw new Error('A partida ainda não está conectada à API.')
    remoteMatch.value = await performApiRequest(() =>
      gameApi.prepareCard(remoteMatch.value!.id, null),
    )
    preparedCardId.value = null
  }

  async function resolveAction(action: InvestigationAction, locationId: LocationId) {
    if (!remoteMatch.value) throw new Error('A partida exige uma conexão ativa com a API.')
    if (!canExecute(action, locationId)) throw new Error('Ação indisponível para os PA atuais.')
    const updated = await performApiRequest(() =>
      gameApi.resolveAction(remoteMatch.value!.id, action, locationId),
    )
    remoteMatch.value = updated
    preparedCardId.value = updated.preparedCardInstanceId
    return updated.journalEntries.at(-1) ?? null
  }

  async function createJournalConnection(fromClueId: string, toClueId: string): Promise<void> {
    if (!remoteMatch.value) throw new Error('A conexão exige uma partida conectada à API.')
    remoteMatch.value = await performApiRequest(() =>
      gameApi.createJournalConnection(remoteMatch.value!.id, fromClueId, toClueId),
    )
    preparedCardId.value = remoteMatch.value.preparedCardInstanceId
  }

  async function accuse(accusation: AccusationSubmission): Promise<void> {
    if (!remoteMatch.value) throw new Error('A acusação exige uma partida conectada à API.')
    remoteMatch.value = await performApiRequest(() =>
      gameApi.accuse(remoteMatch.value!.id, accusation),
    )
    preparedCardId.value = null
  }

  async function moveInvestigator(locationId: LocationId): Promise<void> {
    if (!remoteMatch.value) throw new Error('A partida exige uma conexão ativa com a API.')
    remoteMatch.value = await performApiRequest(() =>
      gameApi.moveInvestigator(remoteMatch.value!.id, locationId),
    )
    preparedCardId.value = remoteMatch.value.preparedCardInstanceId
  }

  async function endRemoteTurn(): Promise<boolean> {
    if (!remoteMatch.value) throw new Error('A partida exige uma conexão ativa com a API.')
    if (!canEndTurn.value) return false
    const updated = await performApiRequest(() => gameApi.endTurn(remoteMatch.value!.id))
    remoteMatch.value = updated
    preparedCardId.value = updated.preparedCardInstanceId
    return true
  }

  async function requestSupportCard(): Promise<void> {
    if (!remoteMatch.value) throw new Error('A partida ainda não está conectada à API.')
    remoteMatch.value = await performApiRequest(() =>
      gameApi.requestSupportCard(remoteMatch.value!.id),
    )
    preparedCardId.value = remoteMatch.value.preparedCardInstanceId
  }

  async function discardPreparedCard(): Promise<boolean> {
    if (!remoteMatch.value || !preparedCard.value || !canDiscardPreparedCard.value) return false
    remoteMatch.value = await performApiRequest(() =>
      gameApi.discardCard(remoteMatch.value!.id, preparedCard.value!.instanceId),
    )
    preparedCardId.value = null
    return true
  }

  async function loadConversationOptions(personId: PersonId, locationId: LocationId) {
    if (!remoteMatch.value) throw new Error('A conversa exige uma partida conectada à API.')
    return performApiRequest(() =>
      gameApi.getConversationOptions(remoteMatch.value!.id, personId, locationId),
    )
  }

  async function resolveConversation(
    personId: PersonId,
    questionId: string,
    locationId: LocationId,
  ) {
    if (!remoteMatch.value) throw new Error('A conversa exige uma partida conectada à API.')
    const updated = await performApiRequest(() =>
      gameApi.resolveConversation(remoteMatch.value!.id, personId, questionId, locationId),
    )
    remoteMatch.value = updated
    preparedCardId.value = updated.preparedCardInstanceId
    return updated.journalEntries.at(-1) ?? null
  }

  function abandonInvestigation(): void {
    investigatorId.value = null
    supportId.value = null
    introductionSeen.value = false
    remoteMatch.value = null
    preparedCardId.value = null
    connectionState.value = 'idle'
    connectionError.value = null
  }

  return {
    investigatorId,
    supportId,
    investigator,
    support,
    introductionSeen,
    remoteMatch,
    connectionState,
    connectionError,
    isRequestPending,
    hand,
    round,
    currentLocationId,
    unlockedLocations,
    moveCostLabel,
    pointsLabel,
    canEndTurn,
    hasUsedSupportThisRound,
    canAccuse,
    canDiscardPreparedCard,
    preparedCard,
    journalEntries,
    canExecute,
    actionCost,
    prepareCard,
    clearPreparedCard,
    createRemoteMatch,
    resumeRemoteMatch,
    retryConnection,
    resolveAction,
    createJournalConnection,
    accuse,
    moveInvestigator,
    endRemoteTurn,
    requestSupportCard,
    discardPreparedCard,
    loadConversationOptions,
    resolveConversation,
    startInvestigation,
    abandonInvestigation,
  }
})
