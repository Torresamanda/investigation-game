<script setup lang="ts">
import SectionHeading from '../../../components/ui/SectionHeading.vue'
import { computed, ref } from 'vue'
import type { HandCard } from '../../../stores/investigation'
import { PhTrash } from '../../../components/icons'
import InvestigationCard from './InvestigationCard.vue'
import CardDetails from './CardDetails.vue'
const props = defineProps<{
  cards: readonly HandCard[]
  ownerLabel: string
  ownerId?: HandCard['ownerId']
  preparedCardId: string | null
  canDiscardPreparedCard: boolean
  isRequestPending?: boolean
  compactActions?: boolean
}>()
const emit = defineEmits<{
  prepare: [instanceId: string]
  clearPrepared: []
  discardPrepared: []
}>()
const cardGroups = computed(() => [
  {
    title: 'Baralho do Investigador',
    description: 'Renova no turno',
    cards: props.cards.filter(
      (card) => !card.temporary && (!props.ownerId || card.ownerId === props.ownerId),
    ),
    isExtra: false,
  },
  {
    title: 'Cartas Temporárias & Extras',
    description: 'Fixas entre turnos até o uso',
    cards: props.cards.filter(
      (card) => card.temporary || (props.ownerId && card.ownerId !== props.ownerId),
    ),
    isExtra: true,
  },
])

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
  <section class="panel hand-panel" aria-label="Sua mão">
    <div class="hand-heading">
      <SectionHeading title="Sua mão" eyebrow="Recursos do investigador" />
      <div class="hand-actions" aria-label="Ações da mão">
        <button
          class="discard-card"
          :class="{ 'discard-card--icon-only': compactActions }"
          aria-label="Descartar carta"
          :disabled="!canDiscardPreparedCard || isRequestPending"
          @click="emit('discardPrepared')"
        >
          <PhTrash :size="16" weight="bold" aria-hidden="true" />
          <span v-if="!compactActions" class="discard-label">Descartar carta</span>
        </button>
      </div>
    </div>
    <div class="hand-groups">
      <section
        v-for="group in cardGroups"
        :key="group.title"
        class="card-group"
        :class="{ 'card-group--extra': group.isExtra }"
      >
        <h3>{{ group.title }} ({{ group.cards.length }})</h3>
        <small>{{ group.description }}</small>
        <div class="card-hand">
          <InvestigationCard
            v-for="card in group.cards"
            :key="card.instanceId"
            :card="card"
            :is-extra="group.isExtra"
            :prepared="preparedCardId === card.instanceId"
            :is-disabled="isRequestPending"
            @toggle="toggleCard"
            @inspect="inspectedCard = $event"
          />
        </div>
      </section>
    </div>
    <CardDetails
      v-if="inspectedCard"
      :card="inspectedCard"
      :owner-label="ownerLabel"
      @close="inspectedCard = null"
    />
  </section>
</template>
