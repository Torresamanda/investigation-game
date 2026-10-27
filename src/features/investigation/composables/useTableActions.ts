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

  async function createMuralLink(fromClueId: string, toClueId: string) {
    try {
      await session.createMuralLink(fromClueId, toClueId)
      feedback.value = statusFeedback('Ligação registrada no mural · Grátis.')
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível criar a conexão.',
      )
    }
  }

  async function createInvestigativeCrossing(fromClueId: string, toClueId: string) {
    const cost = session.remoteMatch?.investigativeCrossingCost ?? 1
    try {
      await session.createInvestigativeCrossing(fromClueId, toClueId)
      feedback.value = statusFeedback(
        `Cruzamento investigativo validado · ${cost === 0 ? 'Grátis' : `${cost} PA de pesquisa gasto.`}`,
      )
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível cruzar as evidências.',
      )
    }
  }

  return { executeAction, moveToLocation, createMuralLink, createInvestigativeCrossing }
}
