<script setup lang="ts">
import { computed } from 'vue'
import {
  locations,
  roundOpenings,
  suspectProfiles,
  type CaseLocation,
} from '../../../content/case01'
const props = defineProps<{
  location: CaseLocation
  hasConfirmedRaulEvidence: boolean
  round: number
}>()
const suspectAtCurrentLocation = computed(() =>
  suspectProfiles.find((item) => item.locationId === props.location.id),
)
const locationNumber = computed(() =>
  String(locations.findIndex((item) => item.id === props.location.id) + 1).padStart(2, '0'),
)
const locationCount = computed(() => String(locations.length).padStart(2, '0'))
const roundOpening = computed(() => roundOpenings[props.round - 1] ?? roundOpenings[0])
const roundOpeningMessage = computed(() =>
  props.round === 4 && props.hasConfirmedRaulEvidence
    ? '“As evidências confirmadas já permitem questionar Raul sobre a rota de segurança.”'
    : roundOpening.value.message,
)
</script>

<template>
  <section class="panel scene-panel" aria-label="Local e abertura da rodada">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Local em observação</p>
        <h2>{{ location.name }}</h2>
      </div>
      <span class="muted">{{ locationNumber }} / {{ locationCount }}</span>
    </div>
    <div class="scene-art-frame">
      <img class="scene-art" :src="location.artwork" :alt="`Cenário: ${location.name}`" />
      <p v-if="suspectAtCurrentLocation" class="scene-presence" role="status">
        {{ suspectAtCurrentLocation.name }} está aqui
      </p>
    </div>
    <p class="scene-description">{{ location.detail }}</p>
    <div class="narrator">
      <p class="eyebrow">{{ roundOpening.speaker }}</p>
      <p>{{ roundOpeningMessage }}</p>
      <small>{{ roundOpening.event }}</small>
    </div>
  </section>
</template>
