<script setup lang="ts">
import { computed } from 'vue'
import { locations, suspectProfiles, type LocationId } from '../../../content/case01'
import type { MatchJournalEntry } from '../../../services/game-api'
import { PhUserFocus, PhX } from '../../../components/icons'
import { journalStatusLabels } from '../action-feedback'
const notes = defineModel<string>('notes', { required: true })
const props = defineProps<{
  hypotheses: readonly { id: number; text: string }[]
  journalEntries: readonly MatchJournalEntry[]
}>()
const tab = defineModel<'timeline' | 'clues' | 'suspects' | 'notes'>('tab', { required: true })
const emit = defineEmits<{ enter: []; leave: []; pin: []; close: []; save: [] }>()

const clueEntries = computed(() => props.journalEntries.filter((entry) => entry.type === 'clue'))
const observationEntries = computed(() =>
  props.journalEntries.filter(
    (entry) => entry.type === 'observation' && !entry.relatedEntryIds?.length,
  ),
)
const connectionEntries = computed(() =>
  props.journalEntries.filter((entry) => Boolean(entry.relatedEntryIds?.length)),
)
const statementEntries = computed(() =>
  props.journalEntries.filter((entry) => entry.type === 'statement'),
)
const journalGroups = computed(() => [
  { title: 'Pistas', entries: clueEntries.value, empty: 'Nenhuma pista registrada.' },
  {
    title: 'Observações',
    entries: observationEntries.value,
    empty: 'Nenhuma observação registrada.',
  },
  {
    title: 'Declarações',
    entries: statementEntries.value,
    empty: 'Nenhuma declaração registrada.',
  },
  { title: 'Conexões', entries: connectionEntries.value, empty: 'Nenhuma conexão registrada.' },
])

const locationNames = Object.fromEntries(
  locations.map((location) => [location.id, location.name]),
) as Record<LocationId, string>

const timelineEvents = computed(() => {
  const discoveredEvents = props.journalEntries.flatMap((entry) => {
    const times = [...`${entry.title} ${entry.content}`.matchAll(/22h(13|14|16|21)/g)]
    return times.map((match) => ({
      time: `22h${match[1]}`,
      content: entry.title,
      round: entry.round,
    }))
  })
  const baseEvents = [
    { time: '22h14', content: 'Uma falha parcial de energia atinge o museu.', round: 1 },
    { time: '22h21', content: 'A luz retorna. O Astrolábio de Navor desapareceu.', round: 1 },
  ]
  const uniqueEvents = new Map(
    [...baseEvents, ...discoveredEvents].map((event) => [`${event.time}:${event.content}`, event]),
  )
  return [...uniqueEvents.values()].sort((left, right) => left.time.localeCompare(right.time))
})

function statusLabel(entry: MatchJournalEntry): string {
  return journalStatusLabels[entry.status]
}
function save() {
  if (!notes.value.trim()) return
  emit('save')
  tab.value = 'notes'
}
const tabs = [
  { id: 'timeline', name: 'Cronologia' },
  { id: 'clues', name: 'Pistas' },
  { id: 'suspects', name: 'Suspeitos' },
  { id: 'notes', name: 'Hipóteses' },
] as const
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
      <div>
        <p class="eyebrow">Memória da investigação</p>
        <h2>Diário do caso</h2>
      </div>
      <button class="journal-close" aria-label="Fechar diário" @click="emit('close')">
        <PhX :size="18" weight="bold" aria-hidden="true" />
      </button>
    </header>
    <div class="journal-tabs" role="group" aria-label="Seções do diário">
      <button
        v-for="item in tabs"
        :key="item.id"
        :aria-pressed="tab === item.id"
        @click="tab = item.id"
      >
        {{ item.name }}
      </button>
    </div>
    <div class="journal-content">
      <template v-if="tab === 'timeline'"
        ><h3>A noite do desaparecimento</h3>
        <div
          v-for="event in timelineEvents"
          :key="`${event.time}:${event.content}`"
          class="timeline-entry"
        >
          <strong>{{ event.time }}</strong>
          <p>{{ event.content }}</p>
          <small>Rodada {{ event.round }}</small>
        </div></template
      ><template v-else-if="tab === 'clues'"
        ><h3>Dossiê da investigação</h3>
        <section v-for="group in journalGroups" :key="group.title" class="journal-group">
          <h4>{{ group.title }}</h4>
          <ol v-if="group.entries.length" class="hypothesis-list">
            <li v-for="entry in group.entries" :key="entry.id" class="journal-entry">
              <div class="journal-entry-heading">
                <strong>{{ entry.title }}</strong>
                <span class="journal-status" :class="`journal-status--${entry.status}`">{{
                  statusLabel(entry)
                }}</span>
              </div>
              <span>{{ entry.content }}</span>
              <small class="journal-entry-meta">
                {{ locationNames[entry.locationId] }} · Rodada {{ entry.round }}
              </small>
              <small v-if="entry.recordedWith === 'pocket-recorder'" class="journal-recorded">
                Registrada com Gravador de Bolso
              </small>
            </li>
          </ol>
          <p v-else class="muted">{{ group.empty }}</p>
        </section></template
      ><template v-else-if="tab === 'suspects'"
        ><h3>Pessoas de interesse</h3>
        <ul class="suspect-list">
          <li v-for="person in suspectProfiles" :key="person.id">
            <PhUserFocus :size="16" aria-hidden="true" /> {{ person.name }}
          </li>
        </ul></template
      ><template v-else
        ><h3>Hipóteses da equipe</h3>
        <p class="muted">Perguntas e anotações livres. Não contam como provas confirmadas.</p>
        <ol class="hypothesis-list">
          <li v-for="hypothesis in hypotheses" :key="hypothesis.id">{{ hypothesis.text }}</li>
        </ol>
        <p v-if="!hypotheses.length" class="muted">
          Salve uma anotação para registrar sua primeira hipótese.
        </p></template
      >
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
