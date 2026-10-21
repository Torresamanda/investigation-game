<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ArtPlaceholder from '../../components/ui/ArtPlaceholder.vue'
import type { InvestigatorId } from '../../content/investigators'
import WorldMap from './components/WorldMap.vue'
import InvestigatorSelection from './components/InvestigatorSelection.vue'
import { useInvestigationStore } from '../../stores/investigation'
import './world-selection.css'

const active = ref<InvestigatorId>('livia')
const support = ref<InvestigatorId>('rafael')
const router = useRouter()
const session = useInvestigationStore()
function start() {
  session.startInvestigation(active.value, support.value)
  void router.push({ name: 'investigation' })
}
</script>

<template>
  <main id="main" class="selection-layout">
    <WorldMap />
    <aside class="mission-panel">
      <div class="world-introduction">
        <ArtPlaceholder label="Arte da Cidade das Brumas" symbol="⌂" />
        <div class="world-description">
          <p class="eyebrow">Mundo 01 · Crime e intriga humana</p>
          <h2>Cidade das Brumas</h2>
          <p class="muted">
            Entre canais, patrimônio e névoa, uma cidade portuária guarda crimes de aparência
            impecável.
          </p>
        </div>
      </div>
      <InvestigatorSelection v-model:active="active" v-model:support="support" />
      <section class="mission-summary">
        <p class="eyebrow">Caso 01 · Introdução</p>
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
        <button class="button-primary full-width" @click="start">
          Iniciar investigação <span aria-hidden="true">→</span>
        </button>
      </footer>
    </aside>
  </main>
</template>
