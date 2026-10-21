<script setup lang="ts">
defineProps<{ label: string; symbol?: string }>()
</script>

<template>
  <div class="art-placeholder" role="img" :aria-label="label">
    <span class="placeholder-symbol" aria-hidden="true">{{ symbol ?? '◇' }}</span>
    <span class="art-caption">{{ label }}</span>
  </div>
</template>
