import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface InvestigationHypothesis {
  readonly id: number
  readonly text: string
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref('')
  const hypotheses = ref<InvestigationHypothesis[]>([])
  let nextHypothesisId = 1

  function saveNote(): boolean {
    const text = notes.value.trim()
    if (!text || text.length > 4000) return false
    hypotheses.value.push({ id: nextHypothesisId++, text })
    notes.value = ''
    return true
  }

  function clearNotes(): void {
    notes.value = ''
    hypotheses.value = []
    nextHypothesisId = 1
  }

  return { notes, hypotheses, saveNote, clearNotes }
})
