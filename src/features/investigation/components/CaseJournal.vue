<script setup lang="ts">
import { computed, ref } from 'vue'
import { locations, type LocationId } from '../../../content/case01'
import type { MatchJournalEntry } from '../../../services/game-api'
import type { MatchHypothesisProgress } from '../../../../shared/contracts/match'
import { journalStatusLabels } from '../action-feedback'
import { hypothesisStatusLabel } from '../operation-readiness'
const notes = defineModel<string>('notes', { required: true })
const props = defineProps<{
  hypotheses: readonly { id: number; text: string }[]
  hypothesisProgress?: readonly MatchHypothesisProgress[]
  journalEntries: readonly MatchJournalEntry[]
  muralLinks: readonly { id: string; fromClueId: string; toClueId: string; round: number }[]
  investigativeCrossingCost: number
  canAffordInvestigativeCrossing: boolean
  isRequestPending?: boolean
}>()
const emit = defineEmits<{
  enter: []
  leave: []
  pin: []
  save: []
  createMuralLink: [fromClueId: string, toClueId: string]
  createInvestigativeCrossing: [fromClueId: string, toClueId: string]
}>()

const fromClueId = ref('')
const toClueId = ref('')
const availableClues = computed(() =>
  props.journalEntries.filter((entry) => entry.type === 'clue' && entry.status === 'confirmed'),
)

const muralLinksWithTitles = computed(() =>
  props.muralLinks.map((muralLink) => ({
    ...muralLink,
    fromTitle: props.journalEntries.find((entry) => entry.id === muralLink.fromClueId)?.title,
    toTitle: props.journalEntries.find((entry) => entry.id === muralLink.toClueId)?.title,
  })),
)

const locationNames = Object.fromEntries(
  locations.map((location) => [location.id, location.name]),
) as Record<LocationId, string>

function statusLabel(entry: MatchJournalEntry): string {
  return journalStatusLabels[entry.status]
}

function hypothesisEvidenceTitles(hypothesis: MatchHypothesisProgress): string[] {
  return hypothesis.evidenceEntryIds
    .map((entryId) => props.journalEntries.find((entry) => entry.id === entryId)?.title)
    .filter((title): title is string => Boolean(title))
}
function save() {
  if (!notes.value.trim()) return
  emit('save')
}

function createMuralLink() {
  if (!fromClueId.value || !toClueId.value || fromClueId.value === toClueId.value) return
  emit('createMuralLink', fromClueId.value, toClueId.value)
}

function createInvestigativeCrossing() {
  if (!fromClueId.value || !toClueId.value || fromClueId.value === toClueId.value) return
  emit('createInvestigativeCrossing', fromClueId.value, toClueId.value)
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
    <section v-if="hypothesisProgress?.length" class="journal-hypothesis-progress">
      <h3>Linhas de raciocínio</h3>
      <article v-for="(hypothesis, index) in hypothesisProgress" :key="index" class="journal-entry">
        <header class="journal-entry-heading">
          <strong>Linha de raciocínio {{ index + 1 }}</strong>
          <span class="journal-status" :class="`journal-status--${hypothesis.status}`">
            {{ hypothesisStatusLabel(hypothesis.status) }}
          </span>
        </header>
        <p>
          {{ hypothesis.coveredAxes.length }} aspecto(s) investigativo(s) confirmado(s) ·
          {{ hypothesis.coherentRelationCount }} relação(ões) coerente(s)
        </p>
        <ul v-if="hypothesisEvidenceTitles(hypothesis).length" class="hypothesis-evidence-list">
          <li v-for="title in hypothesisEvidenceTitles(hypothesis)" :key="title">{{ title }}</li>
        </ul>
      </article>
    </section>
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
      <article v-for="muralLink in muralLinksWithTitles" :key="muralLink.id" class="journal-entry">
        <header class="journal-entry-heading">
          <strong>{{ muralLink.fromTitle }} se relaciona a {{ muralLink.toTitle }}</strong>
          <span class="journal-status">No mural</span>
        </header>
        <small class="journal-entry-meta">Rodada {{ muralLink.round }}</small>
      </article>
      <p
        v-if="!journalEntries.length && !muralLinksWithTitles.length && !hypothesisProgress?.length"
        class="journal-empty-state"
      >
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
      <form class="mural-link-form" @submit.prevent="createMuralLink">
        <h4>Desenhar ligação no mural</h4>
        <p class="muted">Organize duas pistas confirmadas e coerentes sem gastar PA.</p>
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
          Desenhar ligação · Grátis
        </button>
      </form>
      <section class="investigative-crossing-form">
        <h4>Cruzamento investigativo</h4>
        <p class="muted">
          Valide a relação entre as pistas e registre o resultado no diário. Custo:
          {{ investigativeCrossingCost }} PA de pesquisa.
        </p>
        <button
          type="button"
          class="save-note"
          :disabled="
            availableClues.length < 2 ||
            !fromClueId ||
            !toClueId ||
            fromClueId === toClueId ||
            !canAffordInvestigativeCrossing ||
            isRequestPending
          "
          @click="createInvestigativeCrossing"
        >
          Cruzar evidências · {{ investigativeCrossingCost }} PA
        </button>
      </section>
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
