<script setup lang="ts">
import type { ConversationOptions } from '../../../services/game-api'

defineProps<{
  conversation: ConversationOptions
  pointsLabel: string
}>()

const emit = defineEmits<{ close: []; resolve: [questionId: string] }>()
</script>

<template>
  <section
    class="conversation-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="conversation-title"
  >
    <header>
      <div>
        <p class="eyebrow">Conversa em andamento</p>
        <h2 id="conversation-title">{{ conversation.personName }}</h2>
        <p class="conversation-points">Disponível: {{ pointsLabel }}</p>
      </div>
      <button class="conversation-close" aria-label="Fechar conversa" @click="emit('close')">
        Fechar
      </button>
    </header>
    <p v-if="conversation.questions.length" class="conversation-help">
      Escolha uma pergunta. O custo será confirmado pelo motor da investigação.
    </p>
    <div v-if="conversation.questions.length" class="conversation-questions">
      <button
        v-for="question in conversation.questions"
        :key="question.id"
        :disabled="!question.canResolve"
        @click="emit('resolve', question.id)"
      >
        <span>{{ question.text }}</span
        ><small>{{ question.cost }} PA</small>
      </button>
    </div>
    <p v-else class="conversation-help">Todas as perguntas desta conversa já foram registradas.</p>
  </section>
</template>
