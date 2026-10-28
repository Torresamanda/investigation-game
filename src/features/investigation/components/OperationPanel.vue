<script setup lang="ts">
import { computed } from 'vue'
import type { OperationOption } from '../../../services/game-api'
import type { MatchHypothesisProgress } from '../../../../shared/contracts/match'
import { getOperationReadinessGuidance, hypothesisStatusLabel } from '../operation-readiness'

const props = defineProps<{
  operations: readonly OperationOption[]
  hypotheses: readonly MatchHypothesisProgress[]
  isPrepared: boolean
  isFinalRound: boolean
  isRequestPending?: boolean
}>()

const readinessGuidance = computed(() =>
  getOperationReadinessGuidance(props.operations, props.hypotheses),
)

const emit = defineEmits<{
  prepare: [operationId: string]
  resolve: []
  cancel: []
}>()
</script>

<template>
  <section class="operation-dialog" aria-labelledby="operation-title">
    <header class="operation-dialog-heading">
      <div>
        <p class="eyebrow">Progresso da investigação</p>
        <h2 id="operation-title">Preparar operação</h2>
      </div>
    </header>
    <p class="operation-dialog-help">
      Acompanhe como suas linhas avançam e prepare uma operação quando ela estiver disponível.
    </p>
    <section
      v-if="hypotheses.length"
      class="operation-hypothesis-progress"
      aria-label="Progresso das linhas de raciocínio"
    >
      <h3>Progresso das linhas</h3>
      <ul>
        <li v-for="(hypothesis, index) in hypotheses" :key="index">
          <span>Linha {{ index + 1 }}</span>
          <span class="journal-status" :class="`journal-status--${hypothesis.status}`">
            {{ hypothesisStatusLabel(hypothesis.status) }}
          </span>
        </li>
      </ul>
    </section>
    <section
      v-if="!isRequestPending"
      class="operation-readiness-list"
      aria-label="Orientação para avançar"
    >
      <article
        v-for="guidance in readinessGuidance"
        :key="guidance.title"
        class="operation-readiness"
        :class="`operation-readiness--${guidance.kind}`"
        role="status"
      >
        <strong>{{ guidance.title }}</strong>
        <p>{{ guidance.message }}</p>
      </article>
    </section>
    <p v-if="isFinalRound" class="operation-readiness" role="status">
      No prazo final, ainda é possível confirmar informações já encontradas e resolver uma operação.
    </p>
    <article v-for="operation in operations" :key="operation.id" class="journal-entry">
      <small class="operation-kind">
        {{ operation.kind === 'verify' ? 'Verificação' : 'Encerramento' }}
      </small>
      <strong>{{ operation.title }}</strong>
      <p>{{ operation.riskDescription }}</p>
      <button
        class="button-primary"
        type="button"
        :disabled="isRequestPending"
        @click="emit('prepare', operation.id)"
      >
        {{ isPrepared ? 'Trocar operação' : 'Preparar operação' }}
      </button>
    </article>
    <button
      v-if="isPrepared"
      class="button-primary"
      type="button"
      :disabled="isRequestPending"
      @click="emit('resolve')"
    >
      Resolver operação · 2 PA
    </button>
    <button v-if="isPrepared" type="button" :disabled="isRequestPending" @click="emit('cancel')">
      Cancelar preparação
    </button>
  </section>
</template>
