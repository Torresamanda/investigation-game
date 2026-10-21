<script setup lang="ts">
import type { HandCard } from '../../../stores/investigation'
import CardArtwork from '../../../components/ui/CardArtwork.vue'
defineProps<{ card: HandCard; prepared: boolean }>()
const emit = defineEmits<{ inspect: [card: HandCard]; toggle: [instanceId: string] }>()
</script>

<template>
  <div class="investigation-card-shell" :class="{ prepared }">
    <button
      class="investigation-card"
      :aria-label="
        prepared ? `Remover preparação de ${card.name}` : `Preparar ${card.name}, ${card.cost} PA`
      "
      @click="emit('toggle', card.instanceId)"
    >
      <CardArtwork :image="card.image" :name="card.name" :cost="card.cost" />
    </button>
    <button
      class="card-information"
      :aria-label="`Ver informações de ${card.name}`"
      @click="emit('inspect', card)"
    >
      +
    </button>
  </div>
</template>
