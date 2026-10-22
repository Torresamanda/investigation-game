import { computed } from 'vue'
import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'
import { useMatchStore } from './match'
import { useNotesStore } from './notes'
import type { InvestigatorId } from '../content/investigators'
import type { InvestigationAction } from '../../shared/domain/identifiers'
export type { HandCard } from './match'

export const useInvestigationStore = defineStore('investigation', () => {
  const match = useMatchStore()
  const notes = useNotesStore()
  const matchRefs = storeToRefs(match)
  const notesRefs = storeToRefs(notes)
  const mission = computed(() => null)

  function startInvestigation(active: InvestigatorId, support: InvestigatorId): void {
    match.startInvestigation(active, support)
    notes.clearNotes()
  }

  function abandonInvestigation(): void {
    match.abandonInvestigation()
    notes.clearNotes()
  }

  return {
    investigatorId: matchRefs.investigatorId,
    supportId: matchRefs.supportId,
    investigator: matchRefs.investigator,
    support: matchRefs.support,
    introductionSeen: matchRefs.introductionSeen,
    remoteMatch: matchRefs.remoteMatch,
    connectionState: matchRefs.connectionState,
    connectionError: matchRefs.connectionError,
    hand: matchRefs.hand,
    round: matchRefs.round,
    pointsLabel: matchRefs.pointsLabel,
    canEndTurn: matchRefs.canEndTurn,
    canDiscardPreparedCard: matchRefs.canDiscardPreparedCard,
    preparedCard: matchRefs.preparedCard,
    journalEntries: matchRefs.journalEntries,
    canExecute: match.canExecute,
    prepareCard: match.prepareCard,
    clearPreparedCard: match.clearPreparedCard,
    createRemoteMatch: match.createRemoteMatch,
    resolveAction: match.resolveAction,
    endRemoteTurn: match.endRemoteTurn,
    discardPreparedCard: match.discardPreparedCard,
    loadConversationOptions: match.loadConversationOptions,
    resolveConversation: match.resolveConversation,
    notes: notesRefs.notes,
    hypotheses: notesRefs.hypotheses,
    saveNote: notes.saveNote,
    mission,
    startInvestigation,
    abandonInvestigation,
    executeBasicAction: (action?: InvestigationAction) => {
      void action
      return false
    },
    endTurn: () => false,
  }
})
