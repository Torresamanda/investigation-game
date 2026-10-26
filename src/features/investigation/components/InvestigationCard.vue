<script setup lang="ts">
import type { HandCard } from '../../../stores/investigation'
import CardArtwork from '../../../components/ui/CardArtwork.vue'
import { PhInfo } from '../../../components/icons'
defineProps<{ card: HandCard; prepared: boolean; isDisabled?: boolean; isExtra?: boolean }>()
const emit = defineEmits<{ inspect: [card: HandCard]; toggle: [instanceId: string] }>()
</script>

<template>
  <div
    class="investigation-card-shell"
    :class="{ prepared, 'investigation-card-shell--extra': isExtra }"
  >
    <button
      class="investigation-card"
      :disabled="isDisabled"
      :aria-label="
        prepared ? `Remover preparação de ${card.name}` : `Preparar ${card.name}, ${card.cost} PA`
      "
      @click="emit('toggle', card.instanceId)"
    >
      <CardArtwork :image="card.image" :name="card.name" :cost="card.cost" />
    </button>
    <span v-if="isExtra" class="card-extra-label"
      >{{ card.temporary ? 'Temp' : 'Apoio' }} · Fixa · Uso único</span
    >
    <button
      class="card-information"
      :aria-label="`Ver informações de ${card.name}`"
      :disabled="isDisabled"
      @click="emit('inspect', card)"
    >
      <PhInfo :size="15" weight="bold" aria-hidden="true" />
    </button>
  </div>
</template>
