<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
defineProps<{ labelledBy: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
let pointerStartedOutside = false
function isOutside(event: MouseEvent | PointerEvent) {
  if (!dialog.value || event.target !== dialog.value) return false
  const bounds = dialog.value.getBoundingClientRect()
  return (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
}
function trackPointer(event: PointerEvent) {
  pointerStartedOutside = isOutside(event)
}
function handleClick(event: MouseEvent) {
  if (pointerStartedOutside && isOutside(event)) emit('close')
  pointerStartedOutside = false
}
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close?.())
</script>

<template>
  <dialog
    ref="dialog"
    class="app-modal"
    :aria-labelledby="labelledBy"
    @cancel.prevent="emit('close')"
    @pointerdown="trackPointer"
    @click="handleClick"
  >
    <div class="app-modal-content">
      <slot />
    </div>
  </dialog>
</template>

<style>
.app-modal {
  position: fixed;
  inset: 0;
  margin: auto;
  width: fit-content;
  display: grid;
  padding: 0;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
  border: 1px solid var(--gold);
  border-radius: 12px;
  background: var(--ink);
  color: var(--paper);
  overflow: auto;
}

.app-modal-content {
  display: grid;
  gap: 24px;
  padding: 24px;
  min-width: 0;
}

.app-modal::backdrop {
  background: #07121dd9;
}
</style>
