<script setup lang="ts">
import type { Suspect } from '../../../content/case01'
import { getPortrait } from '../../../content/portraits'
import CharacterPortrait from '../../../components/ui/CharacterPortrait.vue'
defineProps<{ person: Suspect }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <section class="suspect-profile" aria-label="Perfil do suspeito" aria-live="polite">
    <CharacterPortrait
      class="suspect-portrait"
      :name="person.name"
      :initials="person.initials"
      :image="getPortrait('suspects', person.portrait)"
    />
    <div class="suspect-profile-content">
      <div class="suspect-profile-heading">
        <p class="eyebrow">Pessoa de interesse</p>
        <h3>{{ person.name }}</h3>
        <p class="suspect-role">{{ person.role }}</p>
      </div>
      <p class="personality-label">Postura e personalidade</p>
      <p class="suspect-personality">{{ person.personality }}</p>
      <p class="suspect-introduction">{{ person.introduction }}</p>
      <small>Conversas e descobertas serão registradas no diário.</small>
    </div>
    <button class="profile-close" aria-label="Voltar ao cenário" @click="emit('close')">
      <span aria-hidden="true">×</span>
    </button>
  </section>
</template>
