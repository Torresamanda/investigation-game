<script setup lang="ts">
import { suspectProfiles } from '../../../content/case01'
import type { MatchJournalEntry } from '../../../services/game-api'
import { PhUserFocus, PhX } from '../../../components/icons'
const notes = defineModel<string>('notes', { required: true })
defineProps<{
  hypotheses: readonly { id: number; text: string }[]
  journalEntries: readonly MatchJournalEntry[]
}>()
const tab = defineModel<'timeline' | 'clues' | 'suspects' | 'notes'>('tab', { required: true })
const emit = defineEmits<{ enter: []; leave: []; pin: []; close: []; save: [] }>()
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
        <div class="timeline-entry">
          <strong>22h14</strong>
          <p>Uma falha parcial de energia atinge o museu.</p>
        </div>
        <div class="timeline-entry">
          <strong>22h21</strong>
          <p>A luz retorna. O Astrolábio de Navor desapareceu.</p>
        </div></template
      ><template v-else-if="tab === 'clues'"
        ><h3>O começo de um dossiê</h3>
        <ol v-if="journalEntries.length" class="hypothesis-list">
          <li v-for="entry in journalEntries" :key="entry.id">
            <strong>{{ entry.title }}</strong>
            <span>{{ entry.content }}</span>
          </li>
        </ol>
        <p v-else class="muted">
          Nenhuma pista foi descoberta. Evidências aparecerão aqui.
        </p></template
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
