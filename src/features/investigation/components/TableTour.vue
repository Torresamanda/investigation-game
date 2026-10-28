<script setup lang="ts">
import type { TableTourStep } from '../composables/useTableTour'

defineProps<{ step: TableTourStep; index: number; totalSteps: number }>()

const emit = defineEmits<{ step: [delta: number]; close: [] }>()
</script>

<template>
  <section class="tour-popover" aria-label="Tour da mesa" aria-live="polite">
    <header class="section-heading">
      <p class="eyebrow">Tour · Passo {{ index + 1 }} de {{ totalSteps }}</p>
      <button @click="emit('close')">Fechar tour</button>
    </header>
    <h3>{{ step.title }}</h3>
    <p>{{ step.description }}</p>
    <div class="section-heading">
      <button :disabled="index === 0" @click="emit('step', -1)">Anterior</button>
      <button @click="emit('step', 1)">
        {{ index === totalSteps - 1 ? 'Concluir' : 'Próximo' }}
      </button>
    </div>
  </section>
</template>
