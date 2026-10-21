<script setup lang="ts">
import type { CardDefinition } from '../../../content/cards'
import CardArtwork from '../../../components/ui/CardArtwork.vue'
defineProps<{ card: CardDefinition }>()
const emit = defineEmits<{ inspect: [card: CardDefinition] }>()
</script>

<template>
  <button
    class="investigation-card"
    :aria-label="`${card.name}, ${card.cost} PA. Ver detalhes`"
    @click="emit('inspect', card)"
  >
    <CardArtwork :image="card.image" :name="card.name" :cost="card.cost" />
  </button>
</template>
