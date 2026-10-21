import { ref, computed, onUnmounted } from 'vue'

// Hover is transient; click or focus inside the journal pins it until explicitly closed.
export function useJournalDisclosure(onClose: () => void) {
  const pinned = ref(false)
  const hovered = ref(false)
  const open = computed(() => pinned.value || hovered.value)
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  function enter() {
    clearTimeout(closeTimer)
    hovered.value = true
  }
  function leave() {
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      hovered.value = false
    }, 180)
  }
  function toggle() {
    clearTimeout(closeTimer)
    pinned.value = !pinned.value
    hovered.value = false
  }
  function pin() {
    pinned.value = true
  }
  function close() {
    clearTimeout(closeTimer)
    pinned.value = false
    hovered.value = false
    onClose()
  }
  onUnmounted(() => clearTimeout(closeTimer))
  return { pinned, open, enter, leave, toggle, pin, close }
}
