<script setup lang="ts">
import CaseDifficulty from '../../components/ui/CaseDifficulty.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { InvestigatorId } from '../../content/investigators'
import cityArtwork from '../../../assets/world/cidade-das-blumas.png'
import { PhArrowRight } from '../../components/icons'
import WorldMap from './components/WorldMap.vue'
import InvestigatorSelection from './components/InvestigatorSelection.vue'
import { useInvestigationStore } from '../../stores/investigation'
import './world-selection.css'

const active = ref<InvestigatorId>('livia')
const support = ref<InvestigatorId>('rafael')
const router = useRouter()
const session = useInvestigationStore()
async function start() {
  if (session.isRequestPending) return
  session.startInvestigation(active.value, support.value)
  try {
    await session.createRemoteMatch(active.value, support.value)
  } catch {
    // A investigação abre apenas para exibir o estado de indisponibilidade da API.
  }
  await router.push({ name: 'investigation' })
}
</script>

<template>
  <main id="main" class="selection-layout">
    <WorldMap />
    <aside class="mission-panel">
      <div class="world-introduction">
        <img class="world-art" :src="cityArtwork" alt="Cidade das Brumas à noite" />
        <div class="world-description">
          <p class="eyebrow">Mundo 01 · Crime e intriga</p>
          <h2>Cidade das Brumas</h2>
          <p class="muted">
            Entre canais, patrimônio e névoa, uma cidade portuária guarda crimes de aparência
            impecável.
          </p>
        </div>
      </div>
      <InvestigatorSelection
        v-model:active="active"
        v-model:support="support"
        :is-disabled="session.isRequestPending"
      />
      <section class="mission-summary">
        <p class="eyebrow">Caso 01 · Introdução</p>
        <CaseDifficulty :level="1" label="Fácil" />
        <h3>O Vazio na Vitrine</h3>
        <p class="muted">
          O Astrolábio de Navor desapareceu de uma vitrine intacta durante sete minutos de apagão.
        </p>
        <div class="mission-meta">
          <span>Prazo<strong>6 rodadas</strong></span
          ><span>Formato<strong>Solo ou dupla</strong></span>
        </div>
      </section>
      <footer class="mission-footer">
        <p
          v-if="session.isRequestPending"
          class="connection-progress"
          role="status"
          aria-live="polite"
        >
          Conectando ao servidor e preparando a partida…
        </p>
        <button
          class="button-primary full-width"
          :disabled="session.isRequestPending"
          @click="start"
        >
          {{ session.isRequestPending ? 'Conectando…' : 'Iniciar investigação' }}
          <PhArrowRight
            v-if="!session.isRequestPending"
            :size="18"
            weight="bold"
            aria-hidden="true"
          />
        </button>
      </footer>
    </aside>
  </main>
</template>
