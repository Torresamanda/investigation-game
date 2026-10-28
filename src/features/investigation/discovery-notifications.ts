import type { MatchNotificationEvent, PublicMatchDto } from '../../../shared/contracts/match'
import { roundOpenings } from '../../content/case01'

type DiscoveryMatchState = Pick<
  PublicMatchDto,
  'id' | 'journalEntries' | 'activeInvestigatorId' | 'decks' | 'notificationEvents'
>

export interface MatchNotification {
  readonly id: string
  readonly kind: MatchNotificationEvent['kind']
  readonly message: string
}

export function findNewMatchNotifications(
  previous: DiscoveryMatchState | null,
  current: DiscoveryMatchState | null,
): readonly MatchNotification[] {
  if (!previous || !current || previous.id !== current.id) return []

  const previousEventIds = new Set((previous.notificationEvents ?? []).map((event) => event.id))
  return (current.notificationEvents ?? [])
    .filter((event) => !previousEventIds.has(event.id))
    .map((event) => {
      const entry = event.entryId
        ? current.journalEntries.find((journalEntry) => journalEntry.id === event.entryId)
        : undefined
      const roundEvent = roundOpenings[event.round - 1]?.event
      const messages = {
        discovery:
          entry?.type === 'statement' ? 'Nova declaração registrada' : 'Nova pista registrada',
        'clue-refuted': 'Uma pista foi refutada. Reavalie a linha de raciocínio.',
        'hypothesis-strengthened': 'Uma linha de raciocínio ganhou força.',
        'hypothesis-contested': 'Uma linha de raciocínio foi contestada.',
        'operation-available': 'Uma operação investigativa está disponível.',
        'action-failure': 'A ação não revelou novas evidências; uma observação foi registrada.',
        'round-event': roundEvent ?? `A Rodada ${event.round} começou.`,
        observation: entry
          ? `Nova observação: ${entry.title}.`
          : 'Uma nova observação foi registrada.',
        'temporary-card': 'Uma carta temporária foi adicionada à mão.',
        'support-card': 'Uma carta de apoio foi adicionada à mão.',
      } satisfies Record<MatchNotification['kind'], string>
      const entryTitle =
        event.kind === 'discovery' ? `: ${entry?.title ?? 'consulte o Diário'}` : ''
      return { id: event.id, kind: event.kind, message: `${messages[event.kind]}${entryTitle}` }
    })
}
