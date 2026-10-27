import { useInvestigationStore } from '../../../stores/investigation'
import { statusFeedback, type InvestigationFeedback } from '../action-feedback'
import type { Ref } from 'vue'
import { ref, watch } from 'vue'
import { feedbackFromEntry } from '../action-feedback'
import type { ConversationOptions } from '../../../services/game-api'
import type { CaseLocation, SuspectId, LocationId } from '../../../content/case01'

export function useTableConversation(
  session: ReturnType<typeof useInvestigationStore>,
  location: Ref<CaseLocation>,
  locationId: Ref<LocationId>,
  selectedSuspectId: Ref<SuspectId | null>,
  panelMode: Ref<'people' | 'journal' | 'operation'>,
  feedback: Ref<InvestigationFeedback>,
) {
  const conversation = ref<ConversationOptions | null>(null)
  const conversationAnswer = ref('')

  watch([locationId, selectedSuspectId, () => session.round], () => {
    conversation.value = null
    conversationAnswer.value = ''
  })

  async function refreshConversation() {
    if (!conversation.value) return
    conversation.value = await session.loadConversationOptions(
      conversation.value.personId,
      location.value.id,
    )
  }

  async function openConversation(personId: SuspectId) {
    try {
      conversation.value = await session.loadConversationOptions(personId, location.value.id)
      panelMode.value = 'people'
      conversationAnswer.value = ''
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível abrir a conversa.',
      )
    }
  }

  async function resolveConversation(questionId: string) {
    const activeConversation = conversation.value
    if (!activeConversation) return
    const preparedCard = session.preparedCard
    const questionCost =
      activeConversation.questions.find((question) => question.id === questionId)?.cost ?? 0
    try {
      const entry = await session.resolveConversation(
        activeConversation.personId,
        questionId,
        location.value.id,
      )
      conversationAnswer.value = entry ? entry.title + ': ' + entry.content : 'Resposta registrada.'
      feedback.value = feedbackFromEntry(
        entry,
        `Conversar · ${activeConversation.personName}`,
        questionCost + (preparedCard?.cost ?? 0),
        preparedCard?.name ?? null,
      )
      conversation.value = await session.loadConversationOptions(
        activeConversation.personId,
        location.value.id,
      )
    } catch (error) {
      feedback.value = statusFeedback(
        error instanceof Error ? error.message : 'Não foi possível resolver a pergunta.',
      )
    }
  }

  return {
    conversation,
    conversationAnswer,
    refreshConversation,
    openConversation,
    resolveConversation,
  }
}
