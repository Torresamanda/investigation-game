<script setup lang="ts">
import { ref, computed } from 'vue'
import ArtPlaceholder from '../../../components/ui/ArtPlaceholder.vue'
import {
  locations,
  suspectProfiles,
  type CaseLocation,
  type SuspectId,
} from '../../../content/case01'
import SuspectProfile from './SuspectProfile.vue'
import SuspectRoster from './SuspectRoster.vue'
import InvestigationActions from './InvestigationActions.vue'
const props = defineProps<{ location: CaseLocation }>()
const selectedSuspectId = ref<SuspectId | null>(null)
defineExpose({
  clearSuspect: () => {
    selectedSuspectId.value = null
  },
})
const selectedSuspect = computed(() =>
  suspectProfiles.find((item) => item.id === selectedSuspectId.value),
)
const locationNumber = computed(() =>
  String(locations.findIndex((item) => item.id === props.location.id) + 1).padStart(2, '0'),
)
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
        @close="selectedSuspectId = null"
      />
      <ArtPlaceholder v-else :label="`Cenário: ${location.name}`" :symbol="location.symbol" />
      <p class="scene-description">{{ location.detail }}</p>
      <SuspectRoster v-model="selectedSuspectId" />
      <div v-if="!selectedSuspect" class="narrator">
        <p class="eyebrow">Sofia Moura · Abertura da Rodada 1</p>
        <p>
          “Sete minutos sem imagem. A vitrine está intacta por fora, e isso elimina qualquer
          explicação simples.”
        </p>
        <small
          >Perímetro preservado: o primeiro Examinar na Galeria revela um detalhe adicional.</small
        >
      </div>
    </div>
    <InvestigationActions />
  </section>
</template>
