<script setup lang="ts">
defineProps<{ message: string }>()

const emit = defineEmits<{ openJournal: []; dismiss: [] }>()
</script>

<template>
  <aside class="discovery-toast" role="status" aria-live="polite">
    <strong>Nova descoberta</strong>
    <p>{{ message }}</p>
    <div class="discovery-toast-actions">
      <button type="button" @click="emit('openJournal')">Abrir no Diário</button>
      <button type="button" @click="emit('dismiss')">Fechar</button>
    </div>
  </aside>
</template>
