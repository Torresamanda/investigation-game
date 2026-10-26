<script setup lang="ts">
import type { ConversationOptions } from '../../../services/game-api'

defineProps<{
  conversation: ConversationOptions

  pointsLabel: string

  answer?: string

  isRequestPending?: boolean
}>()

const emit = defineEmits<{ close: []; resolve: [questionId: string] }>()
</script>

<template>
  <section class="conversation-dialog" aria-labelledby="conversation-title">
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
        :disabled="!question.canResolve || isRequestPending"
        @click="emit('resolve', question.id)"
      >
        <span
          ><small class="conversation-approach">{{
            question.approach === 'inquiry'
              ? 'Apuração'
              : question.approach === 'pressure'
                ? 'Pressão'
                : 'Contexto'
          }}</small
          >{{ question.text }}

          <small v-if="question.isEvidenceBlocked" class="conversation-blocked"
            >Diálogo bloqueado: evidência necessária</small
          ></span
        ><small>{{ question.cost }} PA</small>
      </button>
    </div>

    <p v-else class="conversation-help">Todas as perguntas desta conversa já foram registradas.</p>

    <p class="conversation-help">Prepare suas cartas sociais na mão principal.</p>

    <div v-if="answer" class="conversation-answer" role="status">
      <strong>Resposta registrada</strong>
      <p>{{ answer }}</p>
    </div>
  </section>
</template>
