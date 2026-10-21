<script setup lang="ts">
import type { Suspect } from '../../../content/case01'
defineProps<{ person: Suspect }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <section class="suspect-profile" aria-label="Perfil do suspeito" aria-live="polite">
    <div class="suspect-profile-heading">
      <span class="suspect-portrait" aria-hidden="true">{{ person.initials }}</span>
      <div>
        <p class="eyebrow">Pessoa de interesse</p>
        <h3>{{ person.name }}</h3>
        <p class="suspect-role">{{ person.role }}</p>
      </div>
      <button class="profile-close" aria-label="Voltar ao cenário" @click="emit('close')">×</button>
    </div>
    <p class="personality-label">Postura e personalidade</p>
    <p class="suspect-personality">{{ person.personality }}</p>
    <p class="suspect-introduction">{{ person.introduction }}</p>
    <small>Conversas e descobertas serão registradas no diário.</small>
  </section>
</template>
