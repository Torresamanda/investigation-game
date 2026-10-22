import type { ActionPointPool } from '../domain/action-points'
import type { InvestigatorId, LocationId } from '../domain/identifiers'

export interface MatchJournalEntry {
  readonly id: string
  readonly type: 'clue' | 'observation' | 'statement'
  readonly title: string
  readonly content: string
  readonly locationId: LocationId
  readonly round: number
  readonly status:
    | 'indicio'
    | 'unconfirmed'
    | 'confirmed'
    | 'refuted'
    | 'note'
    | 'recorded'
    | 'contestable'
    | 'blocked'
  readonly recordedWith?: 'pocket-recorder'
}

export interface PublicMatchDto {
  readonly id: string
  readonly mode: 'solo'
  readonly createdAt: string
  readonly preparedCardInstanceId: string | null
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly round: number
  readonly hasDiscardedCardThisRound: boolean
  readonly actionPoints: ActionPointPool
  readonly journalEntries: readonly MatchJournalEntry[]
  readonly decks: Readonly<
    Partial<
      Record<
        InvestigatorId,
        {
          readonly hand: readonly {
            readonly instanceId: string
            readonly definitionId: string
            readonly cost: 0 | 1 | 2
            readonly compatibleActions: readonly string[]
            readonly temporary?: boolean
          }[]
          readonly drawPileCount: number
          readonly discardPileCount: number
        }
      >
    >
  >
}
