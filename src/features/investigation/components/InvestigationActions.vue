<script setup lang="ts">
import type { InvestigationAction } from '../../../domain/game/action-points'

defineProps<{
  availableActions: readonly InvestigationAction[]
  feedback: string
  canEndTurn: boolean
}>()
const emit = defineEmits<{ execute: [action: InvestigationAction]; endTurn: [] }>()
const actions: readonly { label: string; action: InvestigationAction }[] = [
  { label: 'Examinar', action: 'examine' },
  { label: 'Conversar', action: 'converse' },
  { label: 'Analisar', action: 'analyse' },
  { label: 'Pesquisar', action: 'research' },
]
</script>

<template>
  <div class="investigation-controls">
    <div>
      <p class="eyebrow">Decisão do investigador</p>
      <h3>Como deseja investigar?</h3>
    </div>
    <div class="action-grid">
      <button
        v-for="item in actions"
        :key="item.action"
        :disabled="!availableActions.includes(item.action)"
        @click="emit('execute', item.action)"
      >
        {{ item.label }}<small>Base: 2 PA</small>
      </button>
    </div>
    <p class="help-text">O custo será descontado dos PA disponíveis neste turno.</p>
    <p class="feedback" role="status">{{ feedback }}</p>
    <button class="end-turn" :disabled="!canEndTurn" @click="emit('endTurn')">
      Encerrar turno <span aria-hidden="true">→</span>
    </button>
    <div class="accusation-control">
      <button disabled aria-describedby="accusation-help">Acusação bloqueada</button>
      <p id="accusation-help" class="help-text">
        No início de um turno das Rodadas 5 ou 6. Consome o turno completo.
      </p>
    </div>
  </div>
</template>
