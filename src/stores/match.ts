import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { investigators, type InvestigatorId } from '../content/investigators'
import { getCardDefinition, type CardDefinition } from '../content/cards'
import type { InvestigationAction, LocationId, PersonId } from '../../shared/domain/identifiers'
import { canPayAction, investigatorActionCost } from '../../shared/domain/action-points'
import { gameApi, type MatchJournalEntry, type RemoteMatch } from '../services/game-api'

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
      return definition ? [{ ...definition, instanceId: card.instanceId }] : []
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
  const canEndTurn = computed(() => Boolean(remoteMatch.value) && round.value < 6)
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
      canCreateConnection:
        action === 'research' && remoteMatch.value.canCreateInvestigatorConnection,
    })
  }

  function canExecute(
    action: InvestigationAction,
    locationId: LocationId = currentLocationId.value,
  ): boolean {
    if (!remoteMatch.value) return false
    const card = preparedCard.value
    if (card && !card.compatibleActions.includes(action)) return false
    return canPayAction(remoteMatch.value.actionPoints, {
      action,
      amount: actionCost(action, locationId),
      specialtyEligible: Boolean(card && investigatorId.value),
    })
  }

  async function createRemoteMatch(active: InvestigatorId, support: InvestigatorId) {
    connectionState.value = 'connecting'
    connectionError.value = null
    try {
      remoteMatch.value = await gameApi.createMatch(active, support)
      investigatorId.value = active
      supportId.value = support
      connectionState.value = 'connected'
      return remoteMatch.value
    } catch (error) {
      connectionState.value = 'error'
      connectionError.value = error instanceof Error ? error.message : 'A API está indisponível.'
      throw error
    }
  }

  async function prepareCard(instanceId: string): Promise<boolean> {
    if (!remoteMatch.value || !hand.value.some((card) => card.instanceId === instanceId))
      return false
    remoteMatch.value = await gameApi.prepareCard(remoteMatch.value.id, instanceId)
    preparedCardId.value = instanceId
    return true
  }

  async function clearPreparedCard(): Promise<void> {
    if (!remoteMatch.value) throw new Error('A partida ainda não está conectada à API.')
    remoteMatch.value = await gameApi.prepareCard(remoteMatch.value.id, null)
    preparedCardId.value = null
  }

  async function resolveAction(action: InvestigationAction, locationId: LocationId) {
    if (!remoteMatch.value) throw new Error('A partida exige uma conexão ativa com a API.')
    if (!canExecute(action, locationId)) throw new Error('Ação indisponível para os PA atuais.')
    const updated = await gameApi.resolveAction(remoteMatch.value.id, action, locationId)
    remoteMatch.value = updated
    preparedCardId.value = updated.preparedCardInstanceId
    return updated.journalEntries.at(-1) ?? null
  }

  async function moveInvestigator(locationId: LocationId): Promise<void> {
    if (!remoteMatch.value) throw new Error('A partida exige uma conexão ativa com a API.')
    remoteMatch.value = await gameApi.moveInvestigator(remoteMatch.value.id, locationId)
    preparedCardId.value = remoteMatch.value.preparedCardInstanceId
  }

  async function endRemoteTurn(): Promise<boolean> {
    if (!remoteMatch.value) throw new Error('A partida exige uma conexão ativa com a API.')
    if (!canEndTurn.value) return false
    const updated = await gameApi.endTurn(remoteMatch.value.id)
    remoteMatch.value = updated
    preparedCardId.value = updated.preparedCardInstanceId
    return true
  }

  async function discardPreparedCard(): Promise<boolean> {
    if (!remoteMatch.value || !preparedCard.value || !canDiscardPreparedCard.value) return false
    remoteMatch.value = await gameApi.discardCard(
      remoteMatch.value.id,
      preparedCard.value.instanceId,
    )
    preparedCardId.value = null
    return true
  }

  async function loadConversationOptions(personId: PersonId, locationId: LocationId) {
    if (!remoteMatch.value) throw new Error('A conversa exige uma partida conectada à API.')
    return gameApi.getConversationOptions(remoteMatch.value.id, personId, locationId)
  }

  async function resolveConversation(
    personId: PersonId,
    questionId: string,
    locationId: LocationId,
  ) {
    if (!remoteMatch.value) throw new Error('A conversa exige uma partida conectada à API.')
    const updated = await gameApi.resolveConversation(
      remoteMatch.value.id,
      personId,
      questionId,
      locationId,
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
    hand,
    round,
    currentLocationId,
    unlockedLocations,
    moveCostLabel,
    pointsLabel,
    canEndTurn,
    canDiscardPreparedCard,
    preparedCard,
    journalEntries,
    canExecute,
    actionCost,
    prepareCard,
    clearPreparedCard,
    createRemoteMatch,
    resolveAction,
    moveInvestigator,
    endRemoteTurn,
    discardPreparedCard,
    loadConversationOptions,
    resolveConversation,
    startInvestigation,
    abandonInvestigation,
  }
})
