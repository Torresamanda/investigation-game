import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { investigators, type InvestigatorId } from '../content/investigators'
import { getInvestigatorCards, type CardDefinition } from '../content/cards'
import {
  canPerformBasicAction,
  canPerformActionWithCard,
  performBasicAction,
  performActionWithCard,
  prepareNextRound,
  startSoloMission,
  TOTAL_ROUNDS,
  type SoloMission,
} from '../application/game/solo-mission'
import type { InvestigationAction } from '../domain/game/action-points'
import { gameApi, type MatchJournalEntry, type RemoteMatch } from '../services/game-api'
import type { LocationId } from '../content/case01'

export interface HandCard extends CardDefinition {
  readonly instanceId: string
}

export const useInvestigationStore = defineStore('investigation', () => {
  const investigatorId = ref<InvestigatorId | null>(null)
  const supportId = ref<InvestigatorId | null>(null)
  const notes = ref('')
  const hypotheses = ref<{ id: number; text: string }[]>([])
  const introductionSeen = ref(false)
  const mission = ref<SoloMission | null>(null)
  const remoteMatch = ref<RemoteMatch | null>(null)
  const preparedCardId = ref<string | null>(null)
  let nextHypothesisId = 1
  const investigator = computed(() =>
    investigators.find((item) => item.id === investigatorId.value),
  )
  const support = computed(() => investigators.find((item) => item.id === supportId.value))
  const hand = computed<readonly HandCard[]>(() => {
    const activeId = investigatorId.value
    if (!activeId) return []

    const remoteHand = remoteMatch.value?.decks[activeId]?.hand
    if (remoteHand) {
      const definitions = getInvestigatorCards(activeId)
      return remoteHand.flatMap((card) => {
        const definition = definitions.find((item) => item.id === card.definitionId)
        return definition ? [{ ...definition, instanceId: card.instanceId }] : []
      })
    }
    if (!mission.value) return []

    return (mission.value.decks[activeId]?.hand ?? []).map((card) => ({
      ...card.definition,
      instanceId: card.instanceId,
    }))
  })
  const round = computed(() => remoteMatch.value?.round ?? mission.value?.round ?? 1)
  const pointsLabel = computed(() => {
    const points = remoteMatch.value?.actionPoints ?? mission.value?.actionPoints
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
  const canEndTurn = computed(() => round.value < TOTAL_ROUNDS)
  const preparedCard = computed(() =>
    hand.value.find((card) => card.instanceId === preparedCardId.value),
  )
  const journalEntries = computed<readonly MatchJournalEntry[]>(
    () => remoteMatch.value?.journalEntries ?? [],
  )

  function startInvestigation(active: InvestigatorId, support: InvestigatorId) {
    if (active === support) throw new Error('O apoio deve ser outro investigador.')
    abandonInvestigation()
    investigatorId.value = active
    supportId.value = support
    notes.value = ''
    preparedCardId.value = null
    remoteMatch.value = null
    mission.value = startSoloMission({
      activeInvestigatorId: active,
      supportInvestigatorId: support,
    })
  }

  function canExecute(action: InvestigationAction) {
    if (remoteMatch.value) {
      const points = remoteMatch.value.actionPoints
      return points.general + points.specialty >= 2
    }
    if (!mission.value) return false
    return preparedCardId.value
      ? canPerformActionWithCard(mission.value, action, preparedCardId.value)
      : canPerformBasicAction(mission.value, action)
  }

  function executeBasicAction(action: InvestigationAction) {
    if (!mission.value) return false
    if (!canExecute(action)) return false
    mission.value = preparedCardId.value
      ? performActionWithCard(mission.value, action, preparedCardId.value)
      : performBasicAction(mission.value, action)
    preparedCardId.value = null
    return true
  }

  function prepareCard(instanceId: string) {
    if (!hand.value.some((card) => card.instanceId === instanceId)) return false
    preparedCardId.value = instanceId
    return true
  }

  function clearPreparedCard() {
    preparedCardId.value = null
  }

  function endTurn() {
    if (!mission.value || !canEndTurn.value) return false
    preparedCardId.value = null
    mission.value = prepareNextRound(mission.value)
    return true
  }

  async function createRemoteMatch(active: InvestigatorId, support: InvestigatorId) {
    remoteMatch.value = await gameApi.createMatch(active, support)
    return remoteMatch.value
  }

  async function resolveAction(action: InvestigationAction, locationId: LocationId) {
    if (!mission.value || !canExecute(action)) return null

    if (preparedCardId.value) {
      return executeBasicAction(action) ? null : null
    }

    if (!remoteMatch.value) {
      return executeBasicAction(action) ? null : null
    }

    const updated = await gameApi.resolveAction(remoteMatch.value.id, action, locationId)
    remoteMatch.value = updated
    return updated.journalEntries.at(-1) ?? null
  }

  async function endRemoteTurn() {
    if (!remoteMatch.value) return endTurn()
    const updated = await gameApi.endTurn(remoteMatch.value.id)
    remoteMatch.value = updated
    preparedCardId.value = null
    return true
  }

  function saveNote() {
    const text = notes.value.trim()
    if (!text || text.length > 4000) return false
    hypotheses.value.push({ id: nextHypothesisId++, text })
    notes.value = ''
    return true
  }

  function abandonInvestigation() {
    investigatorId.value = null
    supportId.value = null
    notes.value = ''
    hypotheses.value = []
    introductionSeen.value = false
    mission.value = null
    remoteMatch.value = null
    preparedCardId.value = null
    nextHypothesisId = 1
  }

  return {
    investigatorId,
    supportId,
    investigator,
    support,
    mission,
    remoteMatch,
    hand,
    round,
    pointsLabel,
    canEndTurn,
    preparedCard,
    journalEntries,
    canExecute,
    executeBasicAction,
    prepareCard,
    clearPreparedCard,
    endTurn,
    createRemoteMatch,
    resolveAction,
    endRemoteTurn,
    notes,
    hypotheses,
    introductionSeen,
    startInvestigation,
    saveNote,
    abandonInvestigation,
  }
})
