<script setup lang="ts">
import { ref } from 'vue'
const feedback = ref('Escolha como deseja conduzir a investigação.')
const actions = ['Examinar', 'Conversar', 'Analisar', 'Pesquisar'] as const
function selectAction(action: (typeof actions)[number]) {
  feedback.value = action + ': linha de investigação selecionada.'
}
</script>

<template>
  <div class="investigation-controls">
    <div>
      <p class="eyebrow">Decisão do investigador</p>
      <h3>Como deseja investigar?</h3>
    </div>
    <div class="action-grid">
      <button v-for="action in actions" :key="action" @click="selectAction(action)">
        {{ action }}<small>Base: 2 PA</small>
      </button>
    </div>
    <p class="help-text">Habilidades, cartas e eventos podem alterar o custo.</p>
    <p class="feedback" role="status">{{ feedback }}</p>
    <div class="accusation-control">
      <button disabled aria-describedby="accusation-help">Acusação bloqueada</button>
      <p id="accusation-help" class="help-text">
        No início de um turno das Rodadas 5 ou 6. Consome o turno completo.
      </p>
    </div>
  </div>
</template>
