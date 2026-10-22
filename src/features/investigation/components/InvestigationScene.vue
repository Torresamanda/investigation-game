<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  locations,
  roundOpenings,
  suspectProfiles,
  type CaseLocation,
  type SuspectId,
} from '../../../content/case01'
import type { InvestigationAction } from '../../../domain/game/action-points'
import SuspectProfile from './SuspectProfile.vue'
import SuspectRoster from './SuspectRoster.vue'
import InvestigationActions from './InvestigationActions.vue'
const props = defineProps<{
  location: CaseLocation
  availableActions: readonly InvestigationAction[]
  feedback: string
  canEndTurn: boolean
  round: number
}>()
const emit = defineEmits<{
  execute: [action: InvestigationAction]
  converse: [personId: SuspectId]
  endTurn: []
}>()
const selectedSuspectId = ref<SuspectId | null>(null)
defineExpose({
  clearSuspect: () => {
    selectedSuspectId.value = null
  },
})
const selectedSuspect = computed(() =>
  suspectProfiles.find((item) => item.id === selectedSuspectId.value),
)
const suspectAtCurrentLocation = computed(() =>
  suspectProfiles.find((item) => item.locationId === props.location.id),
)
const canConverseWithSelectedSuspect = computed(
  () => selectedSuspect.value?.locationId === props.location.id,
)
const sceneActions = computed(() =>
  props.availableActions.filter(
    (action) => action !== 'converse' || canConverseWithSelectedSuspect.value,
  ),
)
const locationNumber = computed(() =>
  String(locations.findIndex((item) => item.id === props.location.id) + 1).padStart(2, '0'),
)
const roundOpening = computed(() => roundOpenings[props.round - 1] ?? roundOpenings[0])
</script>

<template>
  <section class="panel scene-panel">
    <div class="scene-visual">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Local em observação</p>
          <h2>{{ location.name }}</h2>
        </div>
        <span class="muted">{{ locationNumber }} / 04</span>
      </div>
      <SuspectProfile
        v-if="selectedSuspect"
        :person="selectedSuspect"
        :location="location"
        @close="selectedSuspectId = null"
      />
      <div v-else class="scene-art-frame">
        <img class="scene-art" :src="location.artwork" :alt="`Cenário: ${location.name}`" />
        <p v-if="suspectAtCurrentLocation" class="scene-presence" role="status">
          {{ suspectAtCurrentLocation.name }} está aqui
        </p>
      </div>
      <p class="scene-description">{{ location.detail }}</p>
      <SuspectRoster v-model="selectedSuspectId" :location="location" />
      <div v-if="!selectedSuspect" class="narrator">
        <p class="eyebrow">{{ roundOpening.speaker }}</p>
        <p>{{ roundOpening.message }}</p>
        <small>{{ roundOpening.event }}</small>
      </div>
    </div>
    <InvestigationActions
      :available-actions="sceneActions"
      :feedback="feedback"
      :can-end-turn="canEndTurn"
      @execute="
        $event === 'converse' && selectedSuspect && canConverseWithSelectedSuspect
          ? emit('converse', selectedSuspect.id)
          : emit('execute', $event)
      "
      @end-turn="emit('endTurn')"
    />
  </section>
</template>
