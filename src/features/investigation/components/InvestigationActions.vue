<script setup lang="ts">
import type { InvestigationAction } from '../../../domain/game/action-points'
import { journalStatusLabels, type InvestigationFeedback } from '../action-feedback'
import { PhArrowRight } from '../../../components/icons'
type VisibleInvestigationAction = Exclude<InvestigationAction, 'move' | 'card'>

defineProps<{
  availableActions: readonly InvestigationAction[]
  actionCosts: Readonly<Record<VisibleInvestigationAction, number>>
  feedback: InvestigationFeedback
  canEndTurn: boolean
  canAccuse: boolean
  isRequestPending?: boolean
  round: number
}>()
const emit = defineEmits<{
  execute: [action: InvestigationAction]
  endTurn: []
  accuse: []
}>()
const actions: readonly { label: string; action: VisibleInvestigationAction }[] = [
  { label: 'Examinar', action: 'examine' },
  { label: 'Conversar', action: 'converse' },
  { label: 'Analisar', action: 'analyse' },
  { label: 'Pesquisar', action: 'research' },
]
</script>

<template>
  <section class="panel investigation-controls" aria-label="Seção de investigação">
    <div>
      <p class="eyebrow">Decisão do investigador</p>
      <h3>Como deseja investigar?</h3>
    </div>
    <div class="action-grid">
      <button
        v-for="item in actions"
        :key="item.action"
        :disabled="!availableActions.includes(item.action) || isRequestPending"
        @click="emit('execute', item.action)"
      >
        {{ item.label }}<small>{{ actionCosts[item.action] }} PA</small>
      </button>
    </div>
    <p class="help-text">O custo será descontado dos PA disponíveis neste turno.</p>
    <div class="feedback" role="status" aria-live="polite" aria-atomic="true">
      <p class="feedback-heading">
        <strong>{{ feedback.target }}</strong>
        <span v-if="feedback.cost !== null">{{ feedback.cost }} PA gastos</span>
      </p>
      <p v-if="feedback.cardName" class="feedback-card">Carta aplicada: {{ feedback.cardName }}</p>
      <span
        v-if="feedback.status"
        class="journal-status"
        :class="`journal-status--${feedback.status}`"
      >
        {{ journalStatusLabels[feedback.status] }}
      </span>
      <p class="feedback-result">{{ feedback.result }}</p>
    </div>
    <button class="end-turn" :disabled="!canEndTurn || isRequestPending" @click="emit('endTurn')">
      {{ round === 6 ? 'Encerrar missão' : 'Encerrar turno' }}
      <PhArrowRight :size="18" weight="bold" aria-hidden="true" />
    </button>
    <div class="accusation-control">
      <button
        :disabled="!canAccuse || isRequestPending"
        aria-describedby="accusation-help"
        @click="emit('accuse')"
      >
        {{ canAccuse ? 'Apresentar acusação' : 'Acusação bloqueada' }}
      </button>
      <p id="accusation-help" class="help-text">
        Disponível nas Rodadas 5 e 6. No modo solo, exige 3 PA gerais.
      </p>
    </div>
  </section>
</template>
