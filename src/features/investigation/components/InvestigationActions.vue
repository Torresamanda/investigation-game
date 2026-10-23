<script setup lang="ts">
import { ref, watch } from 'vue'
import type { InvestigationAction } from '../../../domain/game/action-points'
import { journalStatusLabels, type InvestigationFeedback } from '../action-feedback'
import { PhArrowRight } from '../../../components/icons'
type VisibleInvestigationAction = Exclude<InvestigationAction, 'move' | 'card'>

const props = defineProps<{
  availableActions: readonly InvestigationAction[]
  actionCosts: Readonly<Record<VisibleInvestigationAction, number>>
  feedback: InvestigationFeedback
  canEndTurn: boolean
  hasUsableActionPoints: boolean
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

const isEndTurnConfirmationOpen = ref(false)

watch(
  () => [props.round, props.canEndTurn, props.hasUsableActionPoints],
  () => {
    isEndTurnConfirmationOpen.value = false
  },
)

function requestEndTurn() {
  if (props.hasUsableActionPoints) {
    isEndTurnConfirmationOpen.value = true
    return
  }

  emit('endTurn')
}

function confirmEndTurn() {
  isEndTurnConfirmationOpen.value = false
  emit('endTurn')
}
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
    <div class="end-turn-control">
      <template v-if="isEndTurnConfirmationOpen">
        <p class="end-turn-confirmation">Ainda há PA utilizáveis neste turno. Deseja encerrá-lo?</p>
        <div class="end-turn-confirmation-actions">
          <button type="button" @click="isEndTurnConfirmationOpen = false">
            Continuar investigando
          </button>
          <button type="button" class="end-turn" @click="confirmEndTurn">Encerrar turno</button>
        </div>
      </template>
      <button
        v-else
        type="button"
        class="end-turn"
        :disabled="!canEndTurn || isRequestPending"
        @click="requestEndTurn"
      >
        {{ round === 6 ? 'Encerrar missão' : 'Encerrar turno' }}
        <PhArrowRight :size="18" weight="bold" aria-hidden="true" />
      </button>
    </div>
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
