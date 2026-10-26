<script setup lang="ts">
defineProps<{
  message: string
  kind: 'clue' | 'statement' | 'temporary-card' | 'support-card' | 'observation'
}>()

const emit = defineEmits<{ openJournal: []; dismiss: [] }>()

const labels = {
  clue: 'Nova Pista',
  statement: 'Declaração',
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
