<script setup lang="ts">
import { PhImageSquare } from '../icons'

defineProps<{ label: string }>()
</script>

<template>
  <div class="art-placeholder" role="img" :aria-label="label">
    <PhImageSquare class="placeholder-symbol" :size="64" aria-hidden="true" />
    <span class="art-caption">{{ label }}</span>
  </div>
</template>
