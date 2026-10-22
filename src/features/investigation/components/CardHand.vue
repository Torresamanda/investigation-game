<script setup lang="ts">
import { ref } from 'vue'
import type { HandCard } from '../../../stores/investigation'
import { PhTrash } from '../../../components/icons'
import InvestigationCard from './InvestigationCard.vue'
import CardDetails from './CardDetails.vue'
const props = defineProps<{
  cards: readonly HandCard[]
  ownerLabel: string
  preparedCardId: string | null
  canDiscardPreparedCard: boolean
  compactActions?: boolean
}>()
const emit = defineEmits<{
  prepare: [instanceId: string]
  clearPrepared: []
  discardPrepared: []
}>()
const inspectedCard = ref<HandCard | null>(null)
function toggleCard(instanceId: string) {
  if (props.preparedCardId === instanceId) {
    emit('clearPrepared')
    return
  }
  emit('prepare', instanceId)
}
</script>

<template>
  <section class="panel hand-panel" aria-labelledby="hand-title">
    <div class="hand-heading">
      <div>
        <p class="eyebrow">Recursos do investigador</p>
        <h2 id="hand-title">Sua mão</h2>
      </div>
    </div>
    <div class="card-hand">
      <InvestigationCard
        v-for="card in cards"
        :key="card.instanceId"
        :card="card"
        :prepared="preparedCardId === card.instanceId"
        @toggle="toggleCard"
        @inspect="inspectedCard = $event"
      />
    </div>
    <div class="hand-actions" aria-label="Ações da mão">
      <button
        class="discard-card"
        :class="{ 'discard-card--icon-only': compactActions }"
        aria-label="Descartar carta"
        :disabled="!canDiscardPreparedCard"
        @click="emit('discardPrepared')"
      >
        <PhTrash :size="16" weight="bold" aria-hidden="true" />
        <span v-if="!compactActions" class="discard-label">Descartar carta</span>
      </button>
      <button v-if="preparedCardId" class="clear-prepared" @click="emit('clearPrepared')">
        Cancelar
      </button>
    </div>
    <CardDetails
      v-if="inspectedCard"
      :card="inspectedCard"
      :owner-label="ownerLabel"
      @close="inspectedCard = null"
    />
  </section>
</template>
