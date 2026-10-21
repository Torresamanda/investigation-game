<script setup lang="ts">
import { suspectProfiles, type SuspectId } from '../../../content/case01'
import { getPortrait } from '../../../content/portraits'
import CharacterPortrait from '../../../components/ui/CharacterPortrait.vue'
const selectedId = defineModel<SuspectId | null>({ required: true })
</script>

<template>
  <section class="suspects-overview" aria-labelledby="suspects-title">
    <div class="suspects-heading">
      <h3 id="suspects-title">Pessoas de interesse</h3>
      <span>Selecione para ver o perfil</span>
    </div>
    <div class="suspect-roster">
      <button
        v-for="person in suspectProfiles"
        :key="person.id"
        class="suspect-tile"
        :aria-pressed="selectedId === person.id"
        @click="selectedId = person.id"
      >
        <CharacterPortrait
          class="suspect-avatar"
          :name="person.name"
          :initials="person.initials"
          :image="getPortrait('suspects', person.portrait)"
        />
        <span class="suspect-name">{{ person.name }}</span>
        <span class="suspect-occupation">{{ person.role }}</span>
      </button>
    </div>
  </section>
</template>
