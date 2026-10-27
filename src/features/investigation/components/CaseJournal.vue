<script setup lang="ts">
import { computed } from 'vue'
import { locations, type LocationId } from '../../../content/case01'
import type { MatchJournalEntry } from '../../../services/game-api'
import type { MatchHypothesisProgress, MatchMuralLink } from '../../../../shared/contracts/match'
import { journalStatusLabels } from '../action-feedback'
import { hypothesisStatusLabel } from '../operation-readiness'
import InvestigationMural from './InvestigationMural.vue'
const notes = defineModel<string>('notes', { required: true })
const props = defineProps<{
  hypotheses: readonly { id: number; text: string }[]
  hypothesisProgress?: readonly MatchHypothesisProgress[]
  journalEntries: readonly MatchJournalEntry[]
  muralLinks: readonly MatchMuralLink[]
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

function createMuralLink(fromClueId: string, toClueId: string) {
  emit('createMuralLink', fromClueId, toClueId)
}

function createInvestigativeCrossing(fromEntryId: string, toEntryId: string) {
  emit('createInvestigativeCrossing', fromEntryId, toEntryId)
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
    <InvestigationMural
      :journal-entries="journalEntries"
      :mural-links="muralLinks"
      :investigative-crossing-cost="investigativeCrossingCost"
      :can-afford-investigative-crossing="canAffordInvestigativeCrossing"
      :is-request-pending="isRequestPending ?? false"
      @create-mural-link="createMuralLink"
      @create-investigative-crossing="createInvestigativeCrossing"
    />
    <section class="journal-guide" aria-labelledby="journal-guide-title">
      <h3 id="journal-guide-title">Como avançar</h3>
      <dl>
        <div>
          <dt>Pista</dt>
          <dd>
            Registro de uma informação encontrada; seu estado mostra se ainda está em apuração,
            confirmada ou refutada.
          </dd>
        </div>
        <div>
          <dt>Conexão</dt>
          <dd>
            A ligação no mural registra uma associação sem custo. O cruzamento investigativo testa
            uma relação, registra o resultado e custa PA.
          </dd>
        </div>
        <div>
          <dt>Hipótese</dt>
          <dd>
            Linha de raciocínio que reúne pistas confirmadas e relações coerentes. O estado indica
            sua sustentação.
          </dd>
        </div>
        <div>
          <dt>Operação</dt>
          <dd>
            Decisão investigativa: verificar uma linha plausível ou resolver o encerramento quando
            estiver sustentada. Preparar é grátis; resolver custa 2 PA.
          </dd>
        </div>
      </dl>
    </section>
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
    <section v-if="hypotheses.length" class="journal-hypotheses">
      <h3>Hipóteses da equipe</h3>
      <ol class="hypothesis-list">
        <li v-for="hypothesis in hypotheses" :key="hypothesis.id">{{ hypothesis.text }}</li>
      </ol>
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
