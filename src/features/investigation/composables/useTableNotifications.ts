import { onUnmounted, ref, watch } from 'vue'
import type { PublicMatchDto } from '../../../../shared/contracts/match'
import { findNewDiscoveries, type DiscoveryNotification } from '../discovery-notifications'

export function useTableNotifications(
  match: () => PublicMatchDto | null,
  isJournalOpen: () => boolean,
) {
  const notifications = ref<readonly DiscoveryNotification[]>([])
  const unreadCount = ref(0)
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function dismissNotification(id: string) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    notifications.value = notifications.value.filter((notification) => notification.id !== id)
  }

  watch(match, (current, previous) => {
    const discoveries = findNewDiscoveries(previous, current)
    notifications.value = [...notifications.value, ...discoveries]
    if (!isJournalOpen())
      unreadCount.value += discoveries.filter(
        (discovery) => discovery.kind !== 'observation',
      ).length
    for (const discovery of discoveries)
      timers.set(
        discovery.id,
        setTimeout(() => dismissNotification(discovery.id), 6000),
      )
  })

  watch(isJournalOpen, (open) => {
    if (open) unreadCount.value = 0
  })

  onUnmounted(() => timers.forEach((timer) => clearTimeout(timer)))

  return { notifications, unreadCount, dismissNotification }
}
