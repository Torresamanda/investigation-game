import type { MatchJournalEntry } from '../../services/game-api'

export interface InvestigationFeedback {
  readonly target: string
  readonly cost: number | null
  readonly cardName: string | null
  readonly result: string
  readonly resultType: MatchJournalEntry['type'] | 'status'
  readonly status: MatchJournalEntry['status'] | null
}

export const journalStatusLabels: Record<MatchJournalEntry['status'], string> = {
  indicio: 'Indício',
  unconfirmed: 'Não confirmada',
  confirmed: 'Confirmada',
  refuted: 'Refutada',
  note: 'Observação',
  recorded: 'Declaração',
  contestable: 'Contestável',
  blocked: 'Bloqueada',
}

export function feedbackFromEntry(
  entry: MatchJournalEntry | null,
  target: string,
  cost: number,
  cardName: string | null,
): InvestigationFeedback {
  return {
    target,
    cost,
    cardName,
    result: entry ? `${entry.title}: ${entry.content}` : 'Ação concluída sem novo registro.',
    resultType: entry?.type ?? 'status',
    status: entry?.status ?? null,
  }
}

export function statusFeedback(result: string): InvestigationFeedback {
  return {
    target: 'Investigação',
    cost: null,
    cardName: null,
    result,
    resultType: 'status',
    status: null,
  }
}
