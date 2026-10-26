import type { PublicMatchDto } from '../../../shared/contracts/match'

type DiscoveryMatchState = Pick<
  PublicMatchDto,
  'id' | 'journalEntries' | 'activeInvestigatorId' | 'decks'
>

export interface DiscoveryNotification {
  readonly id: string
  readonly kind: 'clue' | 'statement' | 'temporary-card' | 'observation' | 'support-card'
  readonly message: string
}

export function findNewDiscoveries(
  previous: DiscoveryMatchState | null,
  current: DiscoveryMatchState | null,
): readonly DiscoveryNotification[] {
  if (!previous || !current || previous.id !== current.id) return []

  const previousEntryIds = new Set(previous.journalEntries.map((entry) => entry.id))
  const entries = current.journalEntries.flatMap((entry): DiscoveryNotification[] => {
    if (previousEntryIds.has(entry.id)) return []

    return [
      {
        id: `entry:${entry.id}`,
        kind: entry.type,
        message:
          entry.type === 'clue'
            ? 'Uma nova pista foi registrada no Diário.'
            : entry.type === 'statement'
              ? 'Uma nova declaração foi registrada no Diário.'
              : 'Nenhuma descoberta nova: observação registrada no Diário.',
      },
    ]
  })

  const activeInvestigatorId = current.activeInvestigatorId
  const previousCardIds = new Set(
    previous.decks[activeInvestigatorId]?.hand.map((card) => card.instanceId) ?? [],
  )
  const cards = (current.decks[activeInvestigatorId]?.hand ?? []).flatMap(
    (card): DiscoveryNotification[] =>
      (card.temporary || card.ownerId !== activeInvestigatorId) &&
      !previousCardIds.has(card.instanceId)
        ? [
            {
              id: `card:${card.instanceId}`,
              kind: card.temporary ? 'temporary-card' : 'support-card',
              message: card.temporary
                ? 'Uma carta temporária foi adicionada à sua mão.'
                : 'Uma carta de apoio foi adicionada à sua mão.',
            },
          ]
        : [],
  )

  return [...entries, ...cards]
}
