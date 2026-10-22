<script setup lang="ts">
import type { CardDefinition } from '../../../content/cards'
import AppModal from '../../../components/ui/AppModal.vue'
import CardArtwork from '../../../components/ui/CardArtwork.vue'
import { PhX } from '../../../components/icons'
defineProps<{ card: CardDefinition; ownerLabel: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppModal class="card-details" labelled-by="card-detail-title" @close="emit('close')">
    <div class="card-detail-layout">
      <CardArtwork :image="card.image" :name="card.name" :cost="card.cost" />
      <section class="card-detail-copy">
        <button
          class="card-detail-close"
          autofocus
          aria-label="Fechar detalhes da carta"
          @click="emit('close')"
        >
          <PhX :size="20" weight="bold" aria-hidden="true" />
        </button>
        <p class="eyebrow">{{ ownerLabel }} · {{ card.cost }} PA</p>
        <h2 id="card-detail-title">{{ card.name }}</h2>
        <h3>Efeito</h3>
        <p>{{ card.effect }}</p>
        <h3>Contexto de uso</h3>
        <p>{{ card.context }}</p>
        <p class="help-text">
          Somente no turno do dono. Cartas de 0 PA não substituem uma ação básica.
        </p>
      </section>
    </div>
  </AppModal>
</template>
