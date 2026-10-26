<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PersonId } from '../../../../shared/domain/identifiers'
import type { MatchJournalEntry } from '../../../services/game-api'
import type { Suspect } from '../../../content/case01'
import type { ActionPointPool } from '../../../../shared/domain/action-points'
import type { AccusationSubmission } from '../../../services/game-api'

const props = defineProps<{
  suspects: readonly Suspect[]
  confirmedClues: readonly MatchJournalEntry[]
  connectionCount: number
  actionPoints: ActionPointPool
  errorMessage: string | null
  isRequestPending?: boolean
}>()

const emit = defineEmits<{ close: []; accuse: [submission: AccusationSubmission] }>()
const suspectId = ref<PersonId | ''>('')
const meansClueId = ref('')
const opportunityClueId = ref('')
const linkClueId = ref('')
const hasSupportedDossier = computed(
  () =>
    props.confirmedClues.length >= 3 &&
    props.connectionCount >= 2 &&
    props.actionPoints.general >= 3,
)
const canSubmit = computed(
  () =>
    hasSupportedDossier.value &&
    Boolean(suspectId.value && meansClueId.value && opportunityClueId.value && linkClueId.value),
)

function submitAccusation() {
  if (!canSubmit.value || !suspectId.value) return
  emit('accuse', {
    suspectId: suspectId.value,
    meansClueId: meansClueId.value,
    opportunityClueId: opportunityClueId.value,
    linkClueId: linkClueId.value,
  })
}
</script>

<template>
  <section class="accusation-dialog" aria-labelledby="accusation-title">
    <header class="accusation-dialog-heading">
      <div>
        <p class="eyebrow">Dossiê final · Rodada 5 ou 6</p>
        <h2 id="accusation-title">Apresentar acusação</h2>
      </div>
      <button type="button" aria-label="Fechar acusação" @click="emit('close')">Fechar</button>
    </header>

    <p class="accusation-dialog-help">
      Escolha a pessoa e as pistas confirmadas que sustentam cada eixo.
    </p>
    <p v-if="!hasSupportedDossier" class="accusation-readiness" role="status">
      O dossiê precisa de 3 pistas confirmadas, 2 conexões formais e 3 PA gerais.
      <span
        >Agora: {{ confirmedClues.length }} pistas · {{ connectionCount }}
        {{ connectionCount === 1 ? 'conexão' : 'conexões' }} · {{ actionPoints.general }} PA
        gerais.</span
      >
    </p>
    <p v-if="errorMessage" class="accusation-error" role="alert">{{ errorMessage }}</p>

    <label>
      Pessoa acusada
      <select v-model="suspectId">
        <option value="" disabled>Escolha uma pessoa</option>
        <option v-for="suspect in suspects" :key="suspect.id" :value="suspect.id">
          {{ suspect.name }}
        </option>
      </select>
    </label>
    <label>
      Meios
      <select v-model="meansClueId">
        <option value="" disabled>Escolha uma pista confirmada</option>
        <option v-for="clue in confirmedClues" :key="clue.id" :value="clue.id">
          {{ clue.title }}
        </option>
      </select>
    </label>
    <label>
      Oportunidade
      <select v-model="opportunityClueId">
        <option value="" disabled>Escolha uma pista confirmada</option>
        <option v-for="clue in confirmedClues" :key="clue.id" :value="clue.id">
          {{ clue.title }}
        </option>
      </select>
    </label>
    <label>
      Vínculo
      <select v-model="linkClueId">
        <option value="" disabled>Escolha uma pista confirmada</option>
        <option v-for="clue in confirmedClues" :key="clue.id" :value="clue.id">
          {{ clue.title }}
        </option>
      </select>
    </label>
    <button
      class="button-primary"
      type="button"
      :disabled="!canSubmit || isRequestPending"
      @click="submitAccusation"
    >
      Apresentar dossiê · 3 PA
    </button>
  </section>
</template>
