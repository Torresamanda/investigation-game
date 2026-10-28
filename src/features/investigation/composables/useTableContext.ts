import { computed, ref, watch } from 'vue'
import { useInvestigationStore } from '../../../stores/investigation'
import {
  locations,
  suspectProfiles,
  type LocationId,
  type SuspectId,
} from '../../../content/case01'
import type { InvestigationAction } from '../../../domain/game/action-points'

export function useTableContext(session: ReturnType<typeof useInvestigationStore>) {
  const locationId = ref<LocationId>(session.currentLocationId)
  function findSuspectIdAtLocation(targetLocationId: LocationId): SuspectId | null {
    return suspectProfiles.find((person) => person.locationId === targetLocationId)?.id ?? null
  }

  const selectedSuspectId = ref<SuspectId | null>(findSuspectIdAtLocation(locationId.value))
  watch(locationId, (targetLocationId) => {
    selectedSuspectId.value = findSuspectIdAtLocation(targetLocationId)
  })
  watch(
    () => session.currentLocationId,
    (currentLocationId) => {
      locationId.value = currentLocationId
    },
  )
  const location = computed(
    () => locations.find((item) => item.id === locationId.value) ?? locations[0],
  )
  const selectedSuspect = computed(() =>
    suspectProfiles.find((person) => person.id === selectedSuspectId.value),
  )
  const canConverseWithSelectedSuspect = computed(
    () => selectedSuspect.value?.locationId === location.value.id,
  )
  const availableActions = computed<readonly InvestigationAction[]>(() =>
    (['examine', 'converse', 'analyse', 'research'] as const).filter((action) =>
      action === 'converse'
        ? Boolean(session.remoteMatch && canConverseWithSelectedSuspect.value)
        : session.canExecute(action, location.value.id),
    ),
  )
  const actionCosts = computed(() => ({
    examine: session.actionCost('examine', location.value.id),
    converse: session.actionCost('converse', location.value.id),
    analyse: session.actionCost('analyse', location.value.id),
    research: session.actionCost('research', location.value.id),
  }))
  const hasUsableActionPoints = computed(() => {
    const match = session.remoteMatch
    if (!match || match.status !== 'active') return false

    const hasAvailableInvestigationAction = (['examine', 'analyse', 'research'] as const).some(
      (action) => session.canExecute(action, match.currentLocationId),
    )
    const hasAvailableConversation =
      suspectProfiles.some((suspect) => suspect.locationId === match.currentLocationId) &&
      session.canExecute('converse', match.currentLocationId)
    const canPayForMovement =
      match.hasUsedFreeMoveThisRound &&
      match.actionPoints.general >= 1 &&
      match.unlockedLocations.some(
        (unlockedLocation) => unlockedLocation !== match.currentLocationId,
      )
    return (
      hasAvailableInvestigationAction ||
      hasAvailableConversation ||
      canPayForMovement ||
      match.canAffordInvestigativeCrossing
    )
  })
  const investigativeCrossingCost = computed(
    () => session.remoteMatch?.investigativeCrossingCost ?? 1,
  )
  const canAffordInvestigativeCrossing = computed(
    () => session.remoteMatch?.canAffordInvestigativeCrossing ?? false,
  )

  return {
    locationId,
    selectedSuspectId,
    location,
    canConverseWithSelectedSuspect,
    availableActions,
    actionCosts,
    hasUsableActionPoints,
    investigativeCrossingCost,
    canAffordInvestigativeCrossing,
  }
}
