<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { PhDiamond } from '../components/icons'
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
      <RouterLink class="brand" to="/">
        <PhDiamond class="brand-mark" :size="32" weight="bold" aria-hidden="true" />
        <span><small>Agência de Investigação</small><strong>Arquivos Limiar</strong></span>
      </RouterLink>
      <div class="header-context">
        <span class="agency-badge">Divisão de Crimes Patrimoniais</span>
      </div>
    </header>
    <RouterView />
  </div>
</template>
