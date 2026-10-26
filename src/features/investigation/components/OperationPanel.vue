<script setup lang="ts">
import type { OperationOption } from '../../../services/game-api'

defineProps<{
  operations: readonly OperationOption[]
  isPrepared: boolean
  isRequestPending?: boolean
}>()

const emit = defineEmits<{
  prepare: [operationId: string]
  resolve: []
}>()
</script>

<template>
  <section class="accusation-dialog" aria-labelledby="operation-title">
    <header class="accusation-dialog-heading">
      <div>
        <p class="eyebrow">Encerramento investigativo</p>
        <h2 id="operation-title">Preparar operação</h2>
      </div>
    </header>
    <p class="accusation-dialog-help">
      Escolha uma ação narrativa sustentada pelas evidências já organizadas.
    </p>
    <p v-if="!operations.length" class="accusation-readiness" role="status">
      Continue organizando evidências e conexões para desenvolver uma linha de raciocínio.
    </p>
    <article v-for="operation in operations" :key="operation.id" class="journal-entry">
      <strong>{{ operation.title }}</strong>
      <p>{{ operation.riskDescription }}</p>
      <button
        class="button-primary"
        type="button"
        :disabled="isPrepared || isRequestPending"
        @click="emit('prepare', operation.id)"
      >
        Preparar operação
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
  </section>
</template>
