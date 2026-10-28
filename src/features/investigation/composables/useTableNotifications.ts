import { onUnmounted, ref, watch } from 'vue'
import type { PublicMatchDto } from '../../../../shared/contracts/match'
import { findNewMatchNotifications, type MatchNotification } from '../discovery-notifications'

export function useTableNotifications(
  match: () => PublicMatchDto | null,
  isJournalOpen: () => boolean,
) {
  const notifications = ref<readonly MatchNotification[]>([])
  const unreadCount = ref(0)
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  let localNotificationSequence = 0

  function dismissNotification(id: string) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    notifications.value = notifications.value.filter((notification) => notification.id !== id)
  }

  function publishNotifications(newNotifications: readonly MatchNotification[]) {
    notifications.value = [...notifications.value, ...newNotifications]
    if (!isJournalOpen())
      unreadCount.value += newNotifications.filter(
        (notification) => notification.kind !== 'observation',
      ).length
    for (const notification of newNotifications)
      timers.set(
        notification.id,
        setTimeout(() => dismissNotification(notification.id), 6000),
      )
  }

  function notifyActionFailure(message: string) {
    localNotificationSequence += 1
    publishNotifications([
      {
        id: `local-action-failure:${localNotificationSequence}`,
        kind: 'action-failure',
        message,
      },
    ])
  }

  watch(match, (current, previous) => {
    publishNotifications(findNewMatchNotifications(previous, current))
  })

  watch(isJournalOpen, (open) => {
    if (open) unreadCount.value = 0
  })

  onUnmounted(() => timers.forEach((timer) => clearTimeout(timer)))

  return { notifications, unreadCount, dismissNotification, notifyActionFailure }
}
