import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { investigators, type InvestigatorId } from '../content/investigators'

// Session state only. Rule resolution and online synchronization remain server responsibilities.
export const useInvestigationStore = defineStore('investigation', () => {
  const investigatorId = ref<InvestigatorId | null>(null)
  const supportId = ref<InvestigatorId | null>(null)
  const notes = ref('')
  const hypotheses = ref<{ id: number; text: string }[]>([])
  const introductionSeen = ref(false)
  let nextHypothesisId = 1
  const investigator = computed(() =>
    investigators.find((item) => item.id === investigatorId.value),
  )
  const support = computed(() => investigators.find((item) => item.id === supportId.value))

  function startInvestigation(active: InvestigatorId, support: InvestigatorId) {
    if (active === support) throw new Error('O apoio deve ser outro investigador.')
    abandonInvestigation()
    investigatorId.value = active
    supportId.value = support
    notes.value = ''
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
    nextHypothesisId = 1
  }

  return {
    investigatorId,
    supportId,
    investigator,
    support,
    notes,
    hypotheses,
    introductionSeen,
    startInvestigation,
    saveNote,
    abandonInvestigation,
  }
})
