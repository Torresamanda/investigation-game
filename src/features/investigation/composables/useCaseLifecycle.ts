import { useInvestigationStore } from '../../../stores/investigation'
import { statusFeedback, type InvestigationFeedback } from '../action-feedback'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export function useCaseLifecycle(
  session: ReturnType<typeof useInvestigationStore>,
  feedback: import('vue').Ref<InvestigationFeedback>,
) {
  const router = useRouter()
  const deletionError = ref<string | null>(null)
  const showDeletionConfirmation = ref(false)
  async function retryConnection() {
    if (session.isRequestPending) return
    try {
      await session.retryConnection()
    } catch {
      feedback.value = statusFeedback('A conexão falhou. Verifique a API e tente novamente.')
    }
  }

  function requestReturnToWorld() {
    if (!session.remoteMatch || session.remoteMatch.status !== 'active') {
      void router.push({ name: 'worlds' })
      return
    }
    deletionError.value = null
    showDeletionConfirmation.value = true
  }

  async function deleteCurrentMatch() {
    try {
      await session.deleteRemoteMatch()
      showDeletionConfirmation.value = false
      await router.push({ name: 'worlds' })
    } catch (error) {
      deletionError.value =
        error instanceof Error ? error.message : 'Não foi possível excluir a partida.'
    }
  }

  async function endTurn() {
    try {
      if (!(await session.endRemoteTurn())) return
      feedback.value = statusFeedback(
        session.remoteMatch?.status === 'lost'
          ? 'Missão encerrada sem uma operação resolvida.'
          : `Rodada ${String(session.round).padStart(2, '0')} iniciada: mão renovada e PA restaurados.`,
      )
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível encerrar o turno.',
      )
    }
  }

  return {
    showDeletionConfirmation,
    deletionError,
    retryConnection,
    requestReturnToWorld,
    deleteCurrentMatch,
    endTurn,
  }
}
