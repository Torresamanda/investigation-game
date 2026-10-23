<script setup lang="ts">
import { ref } from 'vue'
import { PhArrowLeft, PhBookmarkSimple, PhMinus, PhPlus } from '../../../components/icons'
defineProps<{ open: boolean; pinned: boolean; round: number; unreadCount?: number }>()
const emit = defineEmits<{ enter: []; leave: []; toggle: []; requestReturn: [] }>()
const journalButton = ref<HTMLButtonElement | null>(null)
defineExpose({ focusBookmark: () => journalButton.value?.focus() })
</script>

<template>
  <header class="case-toolbar">
    <div class="case-title">
      <button
        class="back-link"
        type="button"
        aria-label="Retornar ao mundo"
        title="Abandonar a investigação e retornar ao mundo"
        @click="emit('requestReturn')"
      >
        <PhArrowLeft :size="18" weight="bold" aria-hidden="true" /> <span>Retornar ao mundo</span>
      </button>
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
        <span
          v-if="unreadCount"
          class="journal-unread-count"
          :aria-label="`${unreadCount} itens não lidos`"
        >
          {{ unreadCount }}
        </span>
        <PhMinus v-if="open" :size="16" weight="bold" aria-hidden="true" />
        <PhPlus v-else :size="16" weight="bold" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>
