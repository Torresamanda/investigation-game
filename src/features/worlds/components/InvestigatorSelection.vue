<script setup lang="ts">
import { computed, watch } from 'vue'
import { investigators, type InvestigatorId } from '../../../content/investigators'
import { getPortrait } from '../../../content/portraits'
const active = defineModel<InvestigatorId>('active', { required: true })
const support = defineModel<InvestigatorId>('support', { required: true })
defineProps<{ isDisabled: boolean }>()
const availableSupport = computed(() => investigators.filter((item) => item.id !== active.value))
watch(active, (value) => {
  if (support.value === value) support.value = investigators.find((item) => item.id !== value)!.id
})
</script>
<template>
  <section class="team-selection" aria-labelledby="team-title">
    <div class="section-heading">
      <h3 id="team-title">Seu investigador</h3>
      <span class="muted">Solo</span>
    </div>
    <div class="investigator-grid">
      <button
        v-for="item in investigators"
        :key="item.id"
        class="investigator-option"
        :aria-pressed="active === item.id"
        :disabled="isDisabled"
        @click="active = item.id"
      >
        <img
          class="investigator-choice-portrait"
          :src="getPortrait('investigators', item.portrait)"
          alt=""
        />
        <span class="investigator-choice-name">{{ item.name }}</span>
        <small class="investigator-choice-specialty">{{ item.specialty }}</small>
      </button>
    </div>
  </section>
  <div class="support-selection">
    <label class="field-label" for="support">Apoio de plantão</label
    ><select id="support" v-model="support" :disabled="isDisabled">
      <option v-for="item in availableSupport" :key="item.id" :value="item.id">
        {{ item.name }}
      </option>
    </select>
  </div>
</template>
