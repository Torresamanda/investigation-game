<script setup lang="ts">
import { locations, type LocationId } from '../../../content/case01'
import type { Investigator } from '../../../content/investigators'
import CharacterPortrait from '../../../components/ui/CharacterPortrait.vue'
import { getPortrait } from '../../../content/portraits'
const emit = defineEmits<{ select: []; requestSupport: [] }>()
const props = defineProps<{
  investigator?: Investigator
  support?: Investigator
  pointsLabel: string
  unlockedLocations: readonly LocationId[]
  moveCostLabel: string
  hasUsedSupportThisRound: boolean
  isSupportRequestPending: boolean
  isRequestPending?: boolean
  isConnected: boolean
}>()
const locationId = defineModel<LocationId>({ required: true })
function selectLocation(id: LocationId) {
  locationId.value = id
  emit('select')
}
</script>

<template>
  <aside class="panel locations-panel">
    <div class="investigator-overview">
      <p class="eyebrow">Seu turno · Solo</p>
      <CharacterPortrait
        v-if="investigator"
        class="investigator-portrait"
        :name="investigator.name"
        :initials="investigator.initials"
        :image="getPortrait('investigators', investigator.portrait)"
      />
      <h2>{{ investigator?.name }}</h2>
      <div class="investigator-points">
        <small>PA disponíveis</small>
        <strong>{{ pointsLabel }}</strong>
      </div>
      <p class="help-text">Apoio: {{ support?.name }}</p>
      <button
        class="support-action"
        type="button"
        :disabled="
          props.hasUsedSupportThisRound ||
          props.isSupportRequestPending ||
          props.isRequestPending ||
          !props.isConnected
        "
        @click="emit('requestSupport')"
      >
        {{ `Acionar apoio (${support?.name ?? 'indisponível'}) · 1x por rodada` }}
      </button>
    </div>
    <div class="museum-navigation">
      <h3>Locais do museu</h3>
      <nav class="location-list" aria-label="Locais">
        <button
          v-for="item in locations"
          :key="item.id"
          :aria-pressed="locationId === item.id"
          :disabled="!props.unlockedLocations.includes(item.id) || props.isRequestPending"
          @click="selectLocation(item.id)"
        >
          {{ item.name }}
          <small v-if="locationId !== item.id">{{ moveCostLabel }}</small>
        </button>
      </nav>
    </div>
    <p class="rail-note">Observe. Relacione.<br />Sustente sua hipótese.</p>
  </aside>
</template>
