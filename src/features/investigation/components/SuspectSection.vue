<script setup lang="ts">
import { computed } from 'vue'
import { suspectProfiles, type CaseLocation, type SuspectId } from '../../../content/case01'
import SuspectProfile from './SuspectProfile.vue'
import SuspectRoster from './SuspectRoster.vue'

const props = defineProps<{ location: CaseLocation; isConversing?: boolean }>()
const emit = defineEmits<{ converse: [] }>()

const selectedSuspectId = defineModel<SuspectId | null>({ required: true })
const selectedSuspect = computed(() =>
  suspectProfiles.find((person) => person.id === selectedSuspectId.value),
)
</script>

<template>
  <section
    class="panel suspect-section"
    :class="{ 'suspect-section--profile-open': selectedSuspect }"
    aria-label="Pessoas de interesse"
  >
    <SuspectRoster v-model="selectedSuspectId" />
    <SuspectProfile
      v-if="selectedSuspect && !isConversing"
      class="suspect-section-profile"
      :person="selectedSuspect"
      :location="props.location"
    />
    <button
      v-if="selectedSuspect && !isConversing"
      :disabled="selectedSuspect.locationId !== location.id"
      @click="emit('converse')"
    >
      Conversar
    </button>
    <slot />
  </section>
</template>
