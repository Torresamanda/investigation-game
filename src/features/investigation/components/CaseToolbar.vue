<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { PhArrowLeft, PhBookmarkSimple, PhMinus, PhPlus } from '../../../components/icons'
defineProps<{ open: boolean; pinned: boolean; round: number }>()
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
        ><PhArrowLeft :size="18" weight="bold" aria-hidden="true" />
        <span>Retornar ao mundo</span></RouterLink
      >
      <div>
        <p class="eyebrow">Museu de História de Véspera · Caso 01</p>
        <h1>O Vazio na Vitrine</h1>
      </div>
    </div>
    <div class="case-tools">
      <div class="round-indicator">
        <small>Rodada</small><strong>{{ String(round).padStart(2, '0') }} <span>/ 06</span></strong>
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
        <PhBookmarkSimple :size="18" weight="bold" aria-hidden="true" /> Diário
        <PhMinus v-if="open" :size="16" weight="bold" aria-hidden="true" />
        <PhPlus v-else :size="16" weight="bold" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>
