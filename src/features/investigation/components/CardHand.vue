<script setup lang="ts">
import { ref } from 'vue'
import type { HandCard } from '../../../stores/investigation'
import InvestigationCard from './InvestigationCard.vue'
import CardDetails from './CardDetails.vue'
const props = defineProps<{
  cards: readonly HandCard[]
  ownerLabel: string
  pointsLabel: string
  preparedCardId: string | null
}>()
const emit = defineEmits<{ prepare: [instanceId: string]; clearPrepared: [] }>()
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
      <div class="hand-points">
        <small>PA disponíveis</small>
        <strong>{{ pointsLabel }}</strong>
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
    <div class="hand-hint">
      <template v-if="preparedCardId">
        <strong>Carta preparada</strong>
        <span>Escolha uma ação compatível para aplicá-la.</span>
        <button class="clear-prepared" @click="emit('clearPrepared')">Cancelar</button>
      </template>
      <template v-else>
        <strong>{{ ownerLabel }}</strong>
        <span
          >Clique em uma carta para prepará-la; use o ícone de informações para ler detalhes.</span
        >
      </template>
    </div>
    <CardDetails
      v-if="inspectedCard"
      :card="inspectedCard"
      :owner-label="ownerLabel"
      @close="inspectedCard = null"
    />
  </section>
</template>
