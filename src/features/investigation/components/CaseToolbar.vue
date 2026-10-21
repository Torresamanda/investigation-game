<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
defineProps<{ open: boolean; pinned: boolean }>()
const emit = defineEmits<{ enter: []; leave: []; toggle: [] }>()
const journalButton = ref<HTMLButtonElement | null>(null)
defineExpose({ focusBookmark: () => journalButton.value?.focus() })
</script>

<template>
  <header class="case-toolbar">
    <div class="case-title">
      <RouterLink
        class="back-link"
        to="/"
        aria-label="Retornar ao mundo"
        title="Abandonar a investigação e retornar ao mundo"
        >← <span>Retornar ao mundo</span></RouterLink
      >
      <div>
        <p class="eyebrow">Museu de História de Véspera · Caso 01</p>
        <h1>O Vazio na Vitrine</h1>
      </div>
    </div>
    <div class="case-tools">
      <div class="round-indicator">
        <small>Rodada</small><strong>01 <span>/ 06</span></strong>
      </div>
      <button
        ref="journalButton"
        class="journal-bookmark"
        :class="{ pinned: pinned }"
        :aria-expanded="open"
        aria-controls="case-journal"
        @mouseenter="emit('enter')"
        @mouseleave="emit('leave')"
        @click="emit('toggle')"
      >
        <span aria-hidden="true">▤</span> Diário
        <span aria-hidden="true">{{ open ? '−' : '+' }}</span>
      </button>
    </div>
  </header>
</template>
