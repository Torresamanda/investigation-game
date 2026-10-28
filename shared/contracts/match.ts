import type { ActionPointPool } from '../domain/action-points'
import type { InvestigatorId, LocationId } from '../domain/identifiers'
import type { ActionOpportunities } from './investigation-opportunity'

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
  readonly isadoraMarkedContestable?: boolean
  readonly contestableWithEntryIds?: readonly string[]
  readonly relatedEntryIds?: readonly string[]
  readonly protectedUntilRound?: number
  readonly markedForFollowUp?: boolean
}

export interface MatchMuralLink {
  readonly id: string
  readonly fromClueId: string
  readonly toClueId: string
  readonly round: number
}

export interface MatchHypothesisProgress {
  readonly status: 'inquiry' | 'plausible' | 'sustained' | 'contested' | 'discarded'
  readonly evidenceEntryIds: readonly string[]
  readonly coveredAxes: readonly ('means' | 'opportunity' | 'link')[]
  readonly coherentRelationCount: number
}

export type MatchNotificationKind =
  | 'discovery'
  | 'clue-refuted'
  | 'hypothesis-strengthened'
  | 'hypothesis-contested'
  | 'operation-available'
  | 'action-failure'
  | 'round-event'
  | 'observation'
  | 'temporary-card'
  | 'support-card'

export interface MatchNotificationEvent {
  readonly id: string
  readonly kind: MatchNotificationKind
  readonly round: number
  readonly entryId?: string
}

export interface PublicMatchDto {
  readonly id: string
  readonly mode: 'solo'
  readonly createdAt: string
  readonly preparedCardInstanceId: string | null
  readonly preparedOperation?: { readonly operationId: string }
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly round: number
  readonly status: 'active' | 'won' | 'lost'
  readonly examinedLocationsThisRound: readonly LocationId[]
  readonly hasUsedPassiveThisRound: boolean
  readonly hasReceivedSocialBonusThisRound: boolean
  readonly hasSocialConnectionThisRound?: boolean
  readonly hasUsedSocialConnectionThisRound?: boolean
  readonly hasUsedPressLeakConversationThisRound: boolean
  readonly hasFreeConnectionThisRound: boolean
  readonly hasUsedFreeConnectionThisRound: boolean
  readonly investigativeCrossingCost: number
  readonly canAffordInvestigativeCrossing: boolean
  readonly currentLocationId: LocationId
  readonly unlockedLocations: readonly LocationId[]
  readonly hasUsedFreeMoveThisRound: boolean
  readonly hasDiscardedCardThisRound: boolean
  readonly hasUsedSupportThisRound: boolean
  readonly actionPoints: ActionPointPool
  readonly journalEntries: readonly MatchJournalEntry[]
  readonly muralLinks: readonly MatchMuralLink[]
  readonly hypotheses?: readonly MatchHypothesisProgress[]
  readonly notificationEvents?: readonly MatchNotificationEvent[]
  readonly actionOpportunities?: ActionOpportunities
  readonly decks: Readonly<
    Partial<
      Record<
        InvestigatorId,
        {
          readonly hand: readonly {
            readonly instanceId: string
            readonly definitionId: string
            readonly ownerId: InvestigatorId
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
