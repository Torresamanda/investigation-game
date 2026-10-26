<script setup lang="ts">
import { PhStar } from '../icons'

defineProps<{ level: number; label: string }>()
</script>

<template>
  <span class="case-difficulty" :aria-label="`Dificuldade ${label}: ${level} de 3`">
    <PhStar
      v-for="star in 3"
      :key="star"
      :weight="star <= level ? 'fill' : 'regular'"
      :size="16"
      aria-hidden="true"
    />
    <small>{{ label }}</small>
  </span>
</template>
