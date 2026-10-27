<script setup lang="ts">
import { computed, ref } from 'vue'
import { locations, type LocationId } from '../../../content/case01'
import type { MatchMuralLink, MatchJournalEntry } from '../../../../shared/contracts/match'

type MuralEntry = MatchJournalEntry & { readonly type: 'clue' | 'statement' }

interface MuralConnection {
  readonly id: string
  readonly fromEntryId: string
  readonly toEntryId: string
  readonly round: number
  readonly kind: 'visual' | 'contestable'
}

const props = defineProps<{
  journalEntries: readonly MatchJournalEntry[]
  muralLinks: readonly MatchMuralLink[]
  investigativeCrossingCost: number
  canAffordInvestigativeCrossing: boolean
  isRequestPending: boolean
}>()

const emit = defineEmits<{
  createMuralLink: [fromClueId: string, toClueId: string]
  createInvestigativeCrossing: [fromEntryId: string, toEntryId: string]
}>()

const selectedEntryIds = ref<string[]>([])
const selectedConnectionId = ref<string | null>(null)
const isCrossingConfirmationOpen = ref(false)

const boardEntries = computed<MuralEntry[]>(() => [
  ...props.journalEntries.filter(
    (entry): entry is MuralEntry => entry.type === 'clue' && entry.status === 'confirmed',
  ),
  ...props.journalEntries.filter(
    (entry): entry is MuralEntry =>
      entry.type === 'statement' &&
      entry.status === 'contestable' &&
      Boolean(entry.contestableWithEntryIds?.length),
  ),
])

const boardConnections = computed<MuralConnection[]>(() => {
  const availableEntryIds = new Set(boardEntries.value.map((entry) => entry.id))
  const visualConnections = props.muralLinks
    .filter(
      (link) => availableEntryIds.has(link.fromClueId) && availableEntryIds.has(link.toClueId),
    )
    .map((link) => ({
      id: link.id,
      fromEntryId: link.fromClueId,
      toEntryId: link.toClueId,
      round: link.round,
      kind: 'visual' as const,
    }))
  const contestableConnections = boardEntries.value.flatMap((entry) =>
    entry.type === 'statement'
      ? (entry.contestableWithEntryIds ?? [])
          .filter((clueId) => availableEntryIds.has(clueId))
          .map((clueId) => ({
            id: `contestable:${entry.id}:${clueId}`,
            fromEntryId: entry.id,
            toEntryId: clueId,
            round: entry.round,
            kind: 'contestable' as const,
          }))
      : [],
  )

  return [...visualConnections, ...contestableConnections]
})

const selectedConnection = computed(() =>
  boardConnections.value.find((connection) => connection.id === selectedConnectionId.value),
)
const selectedConnectionEntries = computed(() => {
  if (!selectedConnection.value) return undefined

  return {
    from: boardEntries.value.find((entry) => entry.id === selectedConnection.value?.fromEntryId),
    to: boardEntries.value.find((entry) => entry.id === selectedConnection.value?.toEntryId),
  }
})
const selectedClues = computed(() =>
  selectedEntryIds.value.filter((entryId) =>
    boardEntries.value.some((entry) => entry.id === entryId && entry.type === 'clue'),
  ),
)
const boardRowCount = computed(() => Math.max(1, Math.ceil(boardEntries.value.length / 2)))
const locationNames = Object.fromEntries(
  locations.map((location) => [location.id, location.name]),
) as Record<LocationId, string>

function entryTitle(entryId: string): string {
  return boardEntries.value.find((entry) => entry.id === entryId)?.title ?? 'Registro'
}

function entryIndex(entryId: string): number {
  return boardEntries.value.findIndex((entry) => entry.id === entryId)
}

function connectionLine(connection: MuralConnection) {
  const fromIndex = entryIndex(connection.fromEntryId)
  const toIndex = entryIndex(connection.toEntryId)

  return {
    x1: fromIndex % 2 === 0 ? 25 : 75,
    y1: Math.floor(fromIndex / 2) * 100 + 50,
    x2: toIndex % 2 === 0 ? 25 : 75,
    y2: Math.floor(toIndex / 2) * 100 + 50,
  }
}

function toggleEntrySelection(entry: MuralEntry): void {
  if (entry.type !== 'clue') return

  if (selectedEntryIds.value.includes(entry.id)) {
    selectedEntryIds.value = selectedEntryIds.value.filter((entryId) => entryId !== entry.id)
    return
  }

  selectedEntryIds.value =
    selectedEntryIds.value.length < 2 ? [...selectedEntryIds.value, entry.id] : [entry.id]
}

function selectConnection(connection: MuralConnection): void {
  selectedConnectionId.value = connection.id
  isCrossingConfirmationOpen.value = false
}

function drawSelectedLink(): void {
  if (selectedClues.value.length !== 2) return
  emit('createMuralLink', selectedClues.value[0]!, selectedClues.value[1]!)
}

function confirmCrossing(): void {
  if (!selectedConnection.value || !props.canAffordInvestigativeCrossing) return
  emit(
    'createInvestigativeCrossing',
    selectedConnection.value.fromEntryId,
    selectedConnection.value.toEntryId,
  )
  isCrossingConfirmationOpen.value = false
}
</script>

<template>
  <section class="investigation-mural" aria-labelledby="investigation-mural-title">
    <header class="mural-heading">
      <div>
        <p class="eyebrow">Organizar investigação</p>
        <h3 id="investigation-mural-title">Mural de investigação</h3>
      </div>
      <span class="mural-count">{{ boardConnections.length }} ligação(ões)</span>
    </header>
    <p class="mural-help">
      Selecione duas pistas confirmadas para desenhar uma ligação grátis. Selecione uma ligação para
      ver os detalhes e decidir se deseja cruzá-la.
    </p>

    <div v-if="boardEntries.length" class="mural-board" aria-label="Mural de evidências">
      <svg
        class="mural-lines"
        :viewBox="`0 0 100 ${boardRowCount * 100}`"
        :style="{ height: `${boardRowCount * 100}px` }"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          v-for="connection in boardConnections"
          :key="connection.id"
          v-bind="connectionLine(connection)"
          class="mural-line"
          :class="[
            `mural-line--${connection.kind}`,
            { 'mural-line--selected': connection.id === selectedConnectionId },
          ]"
        />
      </svg>
      <button
        v-for="entry in boardEntries"
        :key="entry.id"
        type="button"
        class="mural-evidence-card"
        :class="{
          'mural-evidence-card--selected': selectedEntryIds.includes(entry.id),
          'mural-evidence-card--statement': entry.type === 'statement',
        }"
        :aria-pressed="selectedEntryIds.includes(entry.id)"
        :disabled="entry.type !== 'clue' || isRequestPending"
        @click="toggleEntrySelection(entry)"
      >
        <span class="mural-entry-kind">{{ entry.type === 'clue' ? 'Pista' : 'Declaração' }}</span>
        <strong>{{ entry.title }}</strong>
        <small>
          {{ entry.type === 'clue' ? 'Confirmada' : 'Contestável' }} ·
          {{ locationNames[entry.locationId] }} · Rodada {{ entry.round }}
        </small>
      </button>
    </div>
    <p v-else class="mural-empty-state">
      As pistas confirmadas aparecerão aqui para você organizá-las no mural.
    </p>

    <button
      v-if="selectedClues.length === 2"
      type="button"
      class="mural-draw-button"
      :disabled="isRequestPending"
      @click="drawSelectedLink"
    >
      Desenhar ligação · Grátis
    </button>

    <nav v-if="boardConnections.length" class="mural-connections" aria-label="Ligações do mural">
      <h4>Ligações</h4>
      <button
        v-for="connection in boardConnections"
        :key="connection.id"
        type="button"
        class="mural-connection-choice"
        :class="{ 'mural-connection-choice--selected': connection.id === selectedConnectionId }"
        :aria-pressed="connection.id === selectedConnectionId"
        @click="selectConnection(connection)"
      >
        <span
          >{{ entryTitle(connection.fromEntryId) }} com {{ entryTitle(connection.toEntryId) }}</span
        >
        <small>{{
          connection.kind === 'visual' ? 'Anotação visual' : 'Declaração contestável'
        }}</small>
      </button>
    </nav>

    <section
      v-if="selectedConnection && selectedConnectionEntries?.from && selectedConnectionEntries.to"
      class="mural-selection-detail"
      aria-live="polite"
      aria-labelledby="mural-selection-title"
    >
      <p class="eyebrow">Ligação selecionada · Rodada {{ selectedConnection.round }}</p>
      <h4 id="mural-selection-title">{{ selectedConnectionEntries.from.title }}</h4>
      <p class="mural-selected-pair">
        relacionada a <strong>{{ selectedConnectionEntries.to.title }}</strong>
      </p>
      <p class="mural-help">
        Desenhar a ligação é grátis. Cruzá-la testa a relação e custa
        <strong>{{ investigativeCrossingCost }} PA</strong> segundo o estado atual da partida.
      </p>
      <button
        v-if="!isCrossingConfirmationOpen"
        type="button"
        class="mural-secondary-button"
        :disabled="!canAffordInvestigativeCrossing || isRequestPending"
        @click="isCrossingConfirmationOpen = true"
      >
        Preparar cruzamento
      </button>
      <div
        v-else
        class="mural-crossing-confirmation"
        role="group"
        aria-label="Confirmar cruzamento"
      >
        <p>O cruzamento consumirá {{ investigativeCrossingCost }} PA. Deseja continuar?</p>
        <div>
          <button
            type="button"
            class="mural-primary-button"
            :disabled="!canAffordInvestigativeCrossing || isRequestPending"
            @click="confirmCrossing"
          >
            Confirmar cruzamento · {{ investigativeCrossingCost }} PA
          </button>
          <button
            type="button"
            class="mural-secondary-button"
            :disabled="isRequestPending"
            @click="isCrossingConfirmationOpen = false"
          >
            Voltar
          </button>
        </div>
      </div>
    </section>
    <p v-else-if="boardConnections.length" class="mural-empty-state">
      Selecione uma ligação para consultar os detalhes e iniciar um cruzamento.
    </p>
  </section>
</template>
