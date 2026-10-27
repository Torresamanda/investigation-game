<script setup lang="ts">
import { computed } from 'vue'
import type { ConversationOptions } from '../../../services/game-api'
import { PhArrowLeft } from '../../../components/icons'
import CharacterPortrait from '../../../components/ui/CharacterPortrait.vue'
import { getPortrait } from '../../../content/portraits'
import { suspectProfiles } from '../../../content/case01'
import { opportunityStatusLabels } from '../opportunity-labels'

const props = defineProps<{
  conversation: ConversationOptions
  answer?: string
  isRequestPending?: boolean
}>()

const emit = defineEmits<{ close: []; resolve: [questionId: string] }>()
const conversationPerson = computed(() =>
  suspectProfiles.find((person) => person.id === props.conversation.personId),
)
</script>

<template>
  <section class="conversation-dialog" aria-labelledby="conversation-title">
    <header>
      <div class="conversation-heading">
        <CharacterPortrait
          v-if="conversationPerson"
          class="conversation-person-portrait"
          :name="conversationPerson.name"
          :initials="conversationPerson.initials"
          :image="getPortrait('suspects', conversationPerson.portrait)"
        />
        <div>
          <p class="eyebrow">Conversa em andamento</p>
          <h2 id="conversation-title">{{ conversation.personName }}</h2>
        </div>
      </div>

      <button class="conversation-back" @click="emit('close')">
        <PhArrowLeft :size="16" weight="bold" aria-hidden="true" />
        <span>Perfil</span>
      </button>
    </header>

    <div v-if="answer" class="conversation-answer" role="status">
      <strong>Declaração registrada no diário</strong>
      <p>{{ answer }}</p>
    </div>

    <p
      class="conversation-opportunity"
      :class="`conversation-opportunity--${conversation.opportunity.status}`"
    >
      <strong>{{ opportunityStatusLabels[conversation.opportunity.status] }}</strong>
      {{ conversation.opportunity.message }}
    </p>

    <p v-if="conversation.questions.length" class="conversation-help">
      Escolha uma pergunta. Para usar uma carta social, basta prepará-la na sua mão ao lado.
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
  </section>
</template>
