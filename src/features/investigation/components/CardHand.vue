<script setup lang="ts">
import { ref } from 'vue'
import type { CardDefinition } from '../../../content/cards'
import InvestigationCard from './InvestigationCard.vue'
import CardDetails from './CardDetails.vue'
defineProps<{ cards: readonly CardDefinition[]; ownerLabel: string }>()
const inspectedCard = ref<CardDefinition | null>(null)
</script>

<template>
  <section class="panel hand-panel" aria-labelledby="hand-title">
    <div class="hand-heading">
      <div>
        <p class="eyebrow">Recursos do investigador</p>
        <h2 id="hand-title">Sua mão</h2>
      </div>
      <span class="muted">{{ cards.length }} tipos<br />2 cópias de cada</span>
    </div>
    <div class="card-hand">
      <InvestigationCard
        v-for="card in cards"
        :key="card.id"
        :card="card"
        @inspect="inspectedCard = $event"
      />
    </div>
    <p class="hand-hint">{{ ownerLabel }}<br />Selecione uma carta para ler seu efeito.</p>
    <CardDetails
      v-if="inspectedCard"
      :card="inspectedCard"
      :owner-label="ownerLabel"
      @close="inspectedCard = null"
    />
  </section>
</template>
