<script setup lang="ts">
import { PhArrowLeft, PhBookOpenText } from '../../../components/icons'

defineProps<{ round: number }>()

const emit = defineEmits<{ requestReturn: []; requestTour: [] }>()
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
      <button class="tour-trigger" type="button" @click="emit('requestTour')">
        <PhBookOpenText :size="15" aria-hidden="true" />
        <span>Como funciona a investigação?</span>
      </button>
    </div>
  </header>
</template>
