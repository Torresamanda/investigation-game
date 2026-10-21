<script setup lang="ts">
import { ref, computed } from 'vue'
import { locations, type LocationId } from '../../content/case01'
import { getInvestigatorCards } from '../../content/cards'
import { useInvestigationStore } from '../../stores/investigation'
import { useJournalDisclosure } from './composables/useJournalDisclosure'
import CaseToolbar from './components/CaseToolbar.vue'
import LocationsPanel from './components/LocationsPanel.vue'
import InvestigationScene from './components/InvestigationScene.vue'
import CardHand from './components/CardHand.vue'
import CaseJournal from './components/CaseJournal.vue'
import CaseIntroduction from './components/CaseIntroduction.vue'
import './investigation.css'

const session = useInvestigationStore()
const cards = computed(() =>
  session.investigatorId ? getInvestigatorCards(session.investigatorId) : [],
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
      @enter="enter"
      @leave="leave"
      @toggle="toggle"
    />
    <div class="investigation-layout">
      <LocationsPanel
        v-model="locationId"
        :investigator="session.investigator"
        :support="session.support"
        @select="scene?.clearSuspect()"
      />
      <InvestigationScene ref="scene" :location="location" />
      <CardHand :cards="cards" :owner-label="session.investigator?.name ?? ''" />
      <CaseJournal
        v-if="open"
        v-model:notes="session.notes"
        v-model:tab="journalTab"
        :hypotheses="session.hypotheses"
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
