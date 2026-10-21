<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <div
    class="app-shell"
    :class="{
      'investigation-shell': route.name === 'investigation',
      'selection-shell': route.name === 'worlds',
    }"
  >
    <a class="skip-link" href="#main">Pular para o conteúdo</a>
    <header class="app-header">
      <RouterLink class="brand" to="/"
        ><span class="brand-mark" aria-hidden="true">◈</span
        ><span
          ><small>Agência de Investigações</small><strong>Cidade das Brumas</strong></span
        ></RouterLink
      >
      <span class="agency-badge">Divisão de Crimes Patrimoniais</span>
    </header>
    <RouterView />
  </div>
</template>
