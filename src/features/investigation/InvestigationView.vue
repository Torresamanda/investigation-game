<script setup lang="ts">
import { ref, computed } from 'vue'
import { locations, type LocationId } from '../../content/case01'
import { useInvestigationStore } from '../../stores/investigation'
import type { InvestigationAction } from '../../domain/game/action-points'
import { useJournalDisclosure } from './composables/useJournalDisclosure'
import CaseToolbar from './components/CaseToolbar.vue'
import LocationsPanel from './components/LocationsPanel.vue'
import InvestigationScene from './components/InvestigationScene.vue'
import CardHand from './components/CardHand.vue'
import CaseJournal from './components/CaseJournal.vue'
import CaseIntroduction from './components/CaseIntroduction.vue'
import './investigation.css'

const session = useInvestigationStore()
const feedback = ref('Escolha como deseja conduzir a investigação.')
const cards = computed(() => session.hand)
const availableActions = computed<readonly InvestigationAction[]>(() =>
  (['examine', 'converse', 'analyse', 'research'] as const).filter((action) =>
    session.canExecute(action),
  ),
)
const locationId = ref<LocationId>('gallery')
const location = computed(
  () => locations.find((item) => item.id === locationId.value) ?? locations[0],
)
const journalTab = ref<'timeline' | 'clues' | 'suspects' | 'notes'>('timeline')
const scene = ref<InstanceType<typeof InvestigationScene> | null>(null)
const toolbar = ref<InstanceType<typeof CaseToolbar> | null>(null)
const { open, pinned, enter, leave, toggle, pin, close } = useJournalDisclosure(() =>
  toolbar.value?.focusBookmark(),
)

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
    const journalEntry = await session.resolveAction(action, location.value.id)
    feedback.value = journalEntry
      ? `${journalEntry.title}: ${journalEntry.content}`
      : preparedCard
        ? `${preparedCard.name} aplicada em ${labels[action]}. ${2 + preparedCard.cost} PA gastos.`
        : `${labels[action]}: 2 PA gastos.`
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : `${labels[action]}: PA insuficientes.`
  }
}

function prepareCard(instanceId: string) {
  if (!session.prepareCard(instanceId)) return
  feedback.value = `${session.preparedCard?.name}: escolha uma ação compatível para aplicá-la.`
}

function clearPreparedCard() {
  session.clearPreparedCard()
  feedback.value = 'Preparação removida. Escolha outra carta ou uma ação básica.'
}

async function endTurn() {
  try {
    feedback.value = (await session.endRemoteTurn())
      ? `Rodada ${String(session.round).padStart(2, '0')} preparada: mão recomposta e PA restaurados.`
      : 'Esta é a última rodada da missão.'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Não foi possível encerrar o turno.'
  }
}
</script>

<template>
  <main
    id="main"
    class="investigation-page"
    :class="{ 'journal-is-open': open }"
    @keydown.esc="close"
  >
    <CaseToolbar
      ref="toolbar"
      :open="open"
      :pinned="pinned"
      :round="session.round"
      @enter="enter"
      @leave="leave"
      @toggle="toggle"
    />
    <div class="investigation-layout">
      <LocationsPanel
        v-model="locationId"
        :investigator="session.investigator"
        :support="session.support"
        :points-label="session.pointsLabel"
        @select="scene?.clearSuspect()"
      />
      <InvestigationScene
        ref="scene"
        :location="location"
        :available-actions="availableActions"
        :feedback="feedback"
        :can-end-turn="session.canEndTurn"
        :round="session.round"
        @execute="executeAction"
        @end-turn="endTurn"
      />
      <CardHand
        :cards="cards"
        :owner-label="session.investigator?.name ?? ''"
        :points-label="session.pointsLabel"
        :prepared-card-id="session.preparedCard?.instanceId ?? null"
        @prepare="prepareCard"
        @clear-prepared="clearPreparedCard"
      />
      <CaseJournal
        v-if="open"
        v-model:notes="session.notes"
        v-model:tab="journalTab"
        :hypotheses="session.hypotheses"
        :journal-entries="session.journalEntries"
        @save="session.saveNote()"
        @enter="enter"
        @leave="leave"
        @pin="pin"
        @close="close"
      />
    </div>
    <CaseIntroduction v-if="!session.introductionSeen" @close="session.introductionSeen = true" />
  </main>
</template>
