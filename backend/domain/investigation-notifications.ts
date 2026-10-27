import type { OperationOption } from './investigation-operation.js'
import type { HypothesisStatus } from './investigation-hypothesis.js'
import type { MatchNotificationEvent, SoloMatch } from './match.js'

const hypothesisProgress: Record<HypothesisStatus, number> = {
  inquiry: 0,
  plausible: 1,
  sustained: 2,
  contested: 0,
  discarded: 0,
}

export function appendInvestigationNotifications(
  previous: SoloMatch | undefined,
  current: SoloMatch,
  previousOperations: readonly OperationOption[],
  currentOperations: readonly OperationOption[],
): SoloMatch {
  const events = [...(current.notificationEvents ?? [])]
  if (!previous) return { ...current, notificationEvents: events }

  const addEvent = (event: Omit<MatchNotificationEvent, 'id'>) => {
    events.push({ ...event, id: `${current.id}:notification:${events.length + 1}` })
  }

  if (current.round > previous.round) addEvent({ kind: 'round-event', round: current.round })

  const previousEntries = new Map(previous.journalEntries.map((entry) => [entry.id, entry]))
  for (const entry of current.journalEntries) {
    const previousEntry = previousEntries.get(entry.id)
    if (entry.status === 'refuted' && previousEntry?.status !== 'refuted') {
      addEvent({ kind: 'clue-refuted', round: current.round, entryId: entry.id })
      continue
    }
    if (!previousEntry) {
      if (entry.notificationSignal === 'action-failure') {
        addEvent({ kind: 'action-failure', round: current.round, entryId: entry.id })
      } else if (entry.type === 'clue' || entry.type === 'statement') {
        addEvent({ kind: 'discovery', round: current.round, entryId: entry.id })
      } else if (!(current.round > previous.round && entry.round === current.round)) {
        addEvent({ kind: 'observation', round: current.round, entryId: entry.id })
      }
      continue
    }
  }

  const previousHypotheses = new Map((previous.hypotheses ?? []).map((item) => [item.id, item]))
  for (const hypothesis of current.hypotheses ?? []) {
    const previousStatus = previousHypotheses.get(hypothesis.id)?.status
    if (previousStatus === hypothesis.status) continue
    if (hypothesis.status === 'contested') {
      addEvent({ kind: 'hypothesis-contested', round: current.round })
    } else if (
      hypothesisProgress[hypothesis.status] > hypothesisProgress[previousStatus ?? 'inquiry']
    ) {
      addEvent({ kind: 'hypothesis-strengthened', round: current.round })
    }
  }

  const previousOperationIds = new Set(previousOperations.map((operation) => operation.id))
  for (const operation of currentOperations) {
    if (!previousOperationIds.has(operation.id)) {
      addEvent({ kind: 'operation-available', round: current.round })
    }
  }

  const activeInvestigatorId = current.activeInvestigatorId
  const previousCardIds = new Set(
    previous.decks[activeInvestigatorId].hand.map((card) => card.instanceId),
  )
  for (const card of current.decks[activeInvestigatorId].hand) {
    if (previousCardIds.has(card.instanceId)) continue
    if (card.temporary) addEvent({ kind: 'temporary-card', round: current.round })
    else if (card.ownerId !== activeInvestigatorId)
      addEvent({ kind: 'support-card', round: current.round })
  }

  return { ...current, notificationEvents: events }
}
