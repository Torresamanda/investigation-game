import { useInvestigationStore } from '../../../stores/investigation'
import { statusFeedback, type InvestigationFeedback } from '../action-feedback'
import type { Ref } from 'vue'
import { ref } from 'vue'

export function useTableHand(
  session: ReturnType<typeof useInvestigationStore>,
  feedback: Ref<InvestigationFeedback>,
  refreshConversation: () => Promise<void>,
) {
  const isSupportRequestPending = ref(false)
  async function requestSupportCard() {
    if (
      session.isRequestPending ||
      isSupportRequestPending.value ||
      session.hasUsedSupportThisRound
    )
      return
    isSupportRequestPending.value = true
    try {
      await session.requestSupportCard()
      feedback.value = statusFeedback(
        `Apoio de ${session.support?.name} acionado. A carta recebida custa 1 PA a menos.`,
      )
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível acionar o apoio.',
      )
    } finally {
      isSupportRequestPending.value = false
    }
  }

  async function prepareCard(instanceId: string) {
    try {
      if (!(await session.prepareCard(instanceId))) return
      await refreshConversation()
      feedback.value = statusFeedback(
        `${session.preparedCard?.name}: escolha uma ação compatível para aplicá-la.`,
      )
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível preparar a carta.',
      )
    }
  }

  async function clearPreparedCard() {
    try {
      await session.clearPreparedCard()
      await refreshConversation()
      feedback.value = statusFeedback(
        'Preparação removida. Escolha outra carta ou uma ação básica.',
      )
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível remover a preparação.',
      )
    }
  }

  async function discardPreparedCard() {
    try {
      if (!(await session.discardPreparedCard())) return
      await refreshConversation()
      feedback.value = statusFeedback('Carta descartada e mão recomposta.')
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível descartar a carta.',
      )
    }
  }

  return {
    isSupportRequestPending,
    prepareCard,
    clearPreparedCard,
    discardPreparedCard,
    requestSupportCard,
  }
}
