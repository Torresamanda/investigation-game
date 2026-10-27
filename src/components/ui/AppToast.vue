<script setup lang="ts">
defineProps<{
  message: string
  kind:
    | 'discovery'
    | 'clue-refuted'
    | 'hypothesis-strengthened'
    | 'hypothesis-contested'
    | 'operation-available'
    | 'action-failure'
    | 'round-event'
    | 'temporary-card'
    | 'support-card'
    | 'observation'
}>()

const emit = defineEmits<{ openJournal: []; dismiss: [] }>()

const labels = {
  discovery: 'Nova descoberta',
  'clue-refuted': 'Pista refutada',
  'hypothesis-strengthened': 'Hipótese fortalecida',
  'hypothesis-contested': 'Hipótese contestada',
  'operation-available': 'Operação disponível',
  'action-failure': 'Ação sem descoberta',
  'round-event': 'Evento da rodada',
  'temporary-card': 'Carta Temporária recebida',
  'support-card': 'Carta de Apoio recebida',
  observation: 'Observação',
}
</script>

<template>
  <aside
    class="discovery-toast"
    :class="`discovery-toast--${kind}`"
    role="status"
    aria-live="polite"
  >
    <strong>{{ labels[kind] }}</strong>
    <p>{{ message }}</p>
    <div class="discovery-toast-actions">
      <button @click="emit('openJournal')">Abrir no Diário</button>
      <button @click="emit('dismiss')">Fechar</button>
    </div>
  </aside>
</template>
