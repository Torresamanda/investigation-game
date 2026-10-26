import { useInvestigationStore } from '../../../stores/investigation'
import { statusFeedback, type InvestigationFeedback } from '../action-feedback'
import type { Ref } from 'vue'
import { feedbackFromEntry } from '../action-feedback'
import {
  suspectProfiles,
  type CaseLocation,
  type LocationId,
  type SuspectId,
} from '../../../content/case01'
import type { InvestigationAction } from '../../../domain/game/action-points'

export function useTableActions(
  session: ReturnType<typeof useInvestigationStore>,
  feedback: Ref<InvestigationFeedback>,
  location: Ref<CaseLocation>,
  locationId: Ref<LocationId>,
  selectedSuspectId: Ref<SuspectId | null>,
  hasFreeJournalConnection: Ref<boolean>,
  hasPreparedConnectionCard: Ref<boolean>,
) {
  async function executeAction(action: InvestigationAction) {
    const labels: Record<InvestigationAction, string> = {
      move: 'Deslocar-se',
      examine: 'Examinar',
      converse: 'Conversar',
      analyse: 'Analisar',
      research: 'Pesquisar',
      card: 'Usar carta',
    }
    const preparedCard = session.preparedCard
    try {
      const effectiveCost = session.actionCost(action, location.value.id)
      const journalEntry = await session.resolveAction(action, location.value.id)
      feedback.value = feedbackFromEntry(
        journalEntry,
        `${labels[action]} · ${location.value.name}`,
        effectiveCost,
        preparedCard?.name ?? null,
      )
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : `${labels[action]}: PA insuficientes.`,
      )
    }
  }

  async function moveToLocation() {
    selectedSuspectId.value =
      suspectProfiles.find((person) => person.locationId === locationId.value)?.id ?? null
    if (locationId.value === session.currentLocationId) return
    if (session.connectionState !== 'connected') return
    const moveWasFree = session.moveCostLabel !== '1 PA'
    try {
      await session.moveInvestigator(locationId.value)
      feedback.value = statusFeedback(
        `Deslocamento · ${location.value.name} · ${moveWasFree ? 'Gratuito nesta rodada.' : '1 PA gasto.'}`,
      )
    } catch (error) {
      locationId.value = session.currentLocationId
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível se deslocar.',
      )
    }
  }

  async function createJournalConnection(fromClueId: string, toClueId: string) {
    const isFree = hasFreeJournalConnection.value || hasPreparedConnectionCard.value
    try {
      await session.createJournalConnection(fromClueId, toClueId)
      feedback.value = statusFeedback(
        `Conexão formal criada · ${isFree ? 'Grátis' : '1 PA de pesquisa gasto.'}`,
      )
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível criar a conexão.',
      )
    }
  }

  return { executeAction, moveToLocation, createJournalConnection }
}
