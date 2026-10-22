<script setup lang="ts">
import AppModal from '../../../components/ui/AppModal.vue'
import CharacterPortrait from '../../../components/ui/CharacterPortrait.vue'
import { getPortrait } from '../../../content/portraits'
import { PhArrowRight } from '../../../components/icons'
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppModal class="case-introduction" labelled-by="briefing-title" @close="emit('close')">
    <div class="briefing-layout">
      <CharacterPortrait
        name="Sofia Moura"
        initials="SM"
        :image="getPortrait('investigators', 'sofia-moura')"
      />
      <section class="briefing-copy">
        <p class="eyebrow">Divisão de Crimes Patrimoniais e Casos Especiais</p>
        <h2 id="briefing-title">O Vazio na Vitrine</h2>
        <h3>Delegada Sofia Moura</h3>
        <p>
          “Investigadores, às 22h14 o Museu de História de Véspera sofreu uma interrupção parcial de
          energia.
        </p>
        <p>
          Sete minutos depois, o Astrolábio de Navor havia desaparecido de uma vitrine intacta. Não
          houve arrombamento registrado, e quatro pessoas permaneceram no edifício durante a falha.
        </p>
        <p>
          A imprensa chega pela manhã. Vocês têm seis rodadas antes de a ocorrência sair do nosso
          controle.”
        </p>
        <button class="button-primary" autofocus @click="emit('close')">
          Entrar no museu <PhArrowRight :size="18" weight="bold" aria-hidden="true" />
        </button>
      </section>
    </div>
  </AppModal>
</template>

<style>
.case-introduction {
  width: min(800px, calc(100vw - 32px));
}
.briefing-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  padding: 24px;
}
.briefing-layout > .character-portrait {
  width: 100%;
  align-self: stretch;
  aspect-ratio: auto;
  min-height: 280px;
}
.briefing-copy h2 {
  font-size: 32px;
}
.briefing-copy h3 {
  font-size: 20px;
  color: var(--gold);
}
.briefing-copy > p:not(.eyebrow) {
  font:
    16px/1.6 Georgia,
    serif;
}
.briefing-copy .button-primary {
  width: 100%;
  margin-top: 24px;
}
@media (max-width: 650px) {
  .briefing-layout {
    grid-template-columns: 1fr;
    padding: 20px;
    gap: 16px;
  }
  .briefing-layout > .character-portrait {
    height: 130px;
    min-height: 0;
  }
  .briefing-copy h2 {
    font-size: 27px;
  }
  .briefing-copy > p:not(.eyebrow) {
    font-size: 15px;
  }
}
</style>
