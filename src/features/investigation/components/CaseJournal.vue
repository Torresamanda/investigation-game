<script setup lang="ts">
import { computed, ref } from 'vue'
import { locations, type LocationId } from '../../../content/case01'
import type { MatchJournalEntry } from '../../../services/game-api'
import { journalStatusLabels } from '../action-feedback'
const notes = defineModel<string>('notes', { required: true })
const props = defineProps<{
  hypotheses: readonly { id: number; text: string }[]
  journalEntries: readonly MatchJournalEntry[]
  journalConnections: readonly { id: string; fromClueId: string; toClueId: string; round: number }[]
  hasFreeConnection: boolean
  hasPreparedConnectionCard: boolean
  isRequestPending?: boolean
}>()
const emit = defineEmits<{
  enter: []
  leave: []
  pin: []
  save: []
  createConnection: [fromClueId: string, toClueId: string]
}>()

const fromClueId = ref('')
const toClueId = ref('')
const availableClues = computed(() =>
  props.journalEntries.filter((entry) => entry.type === 'clue' && entry.status !== 'refuted'),
)

const formalConnections = computed(() =>
  props.journalConnections.map((connection) => ({
    ...connection,
    fromTitle: props.journalEntries.find((entry) => entry.id === connection.fromClueId)?.title,
    toTitle: props.journalEntries.find((entry) => entry.id === connection.toClueId)?.title,
  })),
)

const locationNames = Object.fromEntries(
  locations.map((location) => [location.id, location.name]),
) as Record<LocationId, string>

function statusLabel(entry: MatchJournalEntry): string {
  return journalStatusLabels[entry.status]
}
function save() {
  if (!notes.value.trim()) return
  emit('save')
}

function createConnection() {
  if (!fromClueId.value || !toClueId.value || fromClueId.value === toClueId.value) return
  emit('createConnection', fromClueId.value, toClueId.value)
}
</script>

<template>
  <aside
    id="case-journal"
    class="panel journal-panel"
    aria-label="Diário do caso"
    @mouseenter="emit('enter')"
    @mouseleave="emit('leave')"
    @focusin="emit('pin')"
  >
    <header class="journal-heading">
      <h2>Diário do caso</h2>
    </header>
    <div class="journal-record-list" aria-live="polite">
      <article
        v-for="entry in journalEntries"
        :key="entry.id"
        class="journal-entry"
        :class="`journal-entry--${entry.status}`"
      >
        <header class="journal-entry-heading">
          <strong>{{
            entry.title === 'Nenhuma descoberta nova' ? entry.title + ':' : entry.title
          }}</strong>
          <span class="journal-status">{{ statusLabel(entry) }}</span>
        </header>
        <p>{{ entry.content }}</p>
        <small class="journal-entry-meta">
          {{ locationNames[entry.locationId] }} · Rodada {{ entry.round }}
        </small>
        <small v-if="entry.protectedUntilRound" class="journal-recorded">
          Protegida até a Rodada {{ entry.protectedUntilRound }}
        </small>
        <small v-if="entry.markedForFollowUp" class="journal-recorded">
          Vestígio marcado para análise
        </small>
        <small v-if="entry.recordedWith === 'pocket-recorder'" class="journal-recorded">
          Registrada com Gravador de Bolso
        </small>
      </article>
      <article v-for="connection in formalConnections" :key="connection.id" class="journal-entry">
        <header class="journal-entry-heading">
          <strong>{{ connection.fromTitle }} se relaciona a {{ connection.toTitle }}</strong>
          <span class="journal-status">Formal</span>
        </header>
        <small class="journal-entry-meta">Rodada {{ connection.round }}</small>
      </article>
      <p v-if="!journalEntries.length && !formalConnections.length" class="journal-empty-state">
        Nenhum registro no diário ainda.
      </p>
    </div>
    <details class="journal-details">
      <summary>Organizar investigação</summary>
      <section v-if="hypotheses.length" class="journal-hypotheses">
        <h3>Hipóteses da equipe</h3>
        <ol class="hypothesis-list">
          <li v-for="hypothesis in hypotheses" :key="hypothesis.id">{{ hypothesis.text }}</li>
        </ol>
      </section>
      <form class="journal-connection-form" @submit.prevent="createConnection">
        <h4>Criar conexão formal</h4>
        <p class="muted">
          Relacionar pistas custa 1 PA.
          {{
            hasFreeConnection || hasPreparedConnectionCard
              ? 'Você tem uma conexão gratuita disponível.'
              : ''
          }}
        </p>
        <label class="field-label" for="connection-from">Primeira pista</label>
        <select id="connection-from" v-model="fromClueId" required>
          <option value="" disabled>Escolha uma pista</option>
          <option v-for="clue in availableClues" :key="clue.id" :value="clue.id">
            {{ clue.title }}
          </option>
        </select>
        <label class="field-label" for="connection-to">Segunda pista</label>
        <select id="connection-to" v-model="toClueId" required>
          <option value="" disabled>Escolha outra pista</option>
          <option
            v-for="clue in availableClues"
            :key="clue.id"
            :value="clue.id"
            :disabled="clue.id === fromClueId"
          >
            {{ clue.title }}
          </option>
        </select>
        <button
          type="submit"
          class="save-note"
          :disabled="
            availableClues.length < 2 ||
            !fromClueId ||
            !toClueId ||
            fromClueId === toClueId ||
            isRequestPending
          "
        >
          {{
            hasFreeConnection || hasPreparedConnectionCard
              ? 'Criar conexão grátis'
              : 'Criar conexão · 1 PA'
          }}
        </button>
      </form>
    </details>
    <form class="journal-notes" @submit.prevent="save">
      <label class="field-label" for="notes">Anotação livre</label
      ><textarea
        id="notes"
        v-model="notes"
        maxlength="4000"
        placeholder="Qual detalhe merece uma segunda leitura?"
      /><small class="help-text">{{ notes.length }} / 4000</small
      ><button type="submit" class="save-note" :disabled="!notes.trim()">Salvar anotação</button>
    </form>
  </aside>
</template>
