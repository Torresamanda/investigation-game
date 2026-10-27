<script setup lang="ts">
import type { OperationOption } from '../../../services/game-api'

defineProps<{
  operations: readonly OperationOption[]
  isPrepared: boolean
  isFinalRound: boolean
  isRequestPending?: boolean
}>()

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
        <p class="eyebrow">Encerramento investigativo</p>
        <h2 id="operation-title">Preparar operação</h2>
      </div>
    </header>
    <p class="operation-dialog-help">
      Escolha uma ação narrativa sustentada pelas evidências já organizadas.
    </p>
    <p v-if="!operations.length" class="operation-readiness" role="status">
      Continue organizando evidências e conexões para desenvolver uma linha de raciocínio.
    </p>
    <p v-if="isFinalRound" class="operation-readiness" role="status">
      No prazo final, ainda é possível confirmar informações já encontradas e resolver uma operação.
    </p>
    <article v-for="operation in operations" :key="operation.id" class="journal-entry">
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
