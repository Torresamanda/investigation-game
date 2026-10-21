<script setup lang="ts">
defineProps<{ name: string; initials: string; image?: string }>()
</script>

<template>
  <div class="character-portrait" role="img" :aria-label="`Retrato de ${name}`">
    <img v-if="image" :src="image" alt="" />
    <template v-else
      ><span aria-hidden="true">{{ initials }}</span
      ><small>Retrato</small></template
    >
  </div>
</template>

<style>
.character-portrait {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  aspect-ratio: 2/3;
  overflow: hidden;
  border: 1px solid #c79a5370;
  border-radius: 8px;
  background: radial-gradient(ellipse at 50% 20%, #2e677250, transparent), #142d40;
  color: var(--gold);
}
.character-portrait > span {
  font:
    28px Georgia,
    serif;
}
.character-portrait > small {
  font-size: 9px;
  color: #a9bfcd;
}
.character-portrait > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
