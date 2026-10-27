import {
  investigatorIds,
  locationIds,
  investigationActions,
  type InvestigatorId,
  type LocationId,
  type InvestigationAction,
} from '../../shared/domain/identifiers.js'
import type { ActionPointPool } from '../../shared/domain/action-points.js'
import type { EvidenceAxis, InvestigationHypothesis } from './investigation-hypothesis.js'
import type { PreparedOperation } from './investigation-operation.js'

export { investigatorIds, locationIds, investigationActions }
export type { InvestigatorId, LocationId, InvestigationAction }

export type ActionPoints = ActionPointPool

export interface JournalEntry {
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
  readonly relatedEntryIds?: readonly string[]
  readonly protectedUntilRound?: number
  readonly markedForFollowUp?: boolean
  readonly caseEvidenceKey?: CaseEvidenceKey
  readonly evidenceAxes?: readonly EvidenceAxis[]
  readonly hypothesisThreadIds?: readonly string[]
}

export type CaseEvidenceKey =
  | 'e1-confirmed'
  | 'e2-confirmed'
  | 'e3-confirmed'
  | 'e4-confirmed'
  | 'e5-confirmed'
  | 'e6-confirmed'

export interface MuralLink {
  readonly id: string
  readonly fromClueId: string
  readonly toClueId: string
  readonly round: number
}

export interface InvestigativeRelation {
  readonly id: string
  readonly fromClueId: string
  readonly toClueId: string
  readonly round: number
  readonly hypothesisThreadId: string
}

export interface SoloMatch {
  readonly id: string
  readonly version: number
  readonly mode: 'solo'
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly round: number
  readonly examinedLocationsThisRound: readonly LocationId[]
  readonly hasUsedPassiveThisRound: boolean
  readonly hasReceivedSocialBonusThisRound: boolean
  readonly hasSocialConnectionThisRound?: boolean
  readonly hasUsedSocialConnectionThisRound?: boolean
  readonly hasUsedPressLeakConversationThisRound: boolean
  readonly hasFreeConnectionThisRound: boolean
  readonly hasUsedFreeConnectionThisRound: boolean
  readonly currentLocationId: LocationId
  readonly unlockedLocations: readonly LocationId[]
  readonly hasUsedFreeMoveThisRound: boolean
  readonly hasDiscardedCardThisRound: boolean
  readonly hasUsedSupportThisRound: boolean
  readonly status: 'active' | 'won' | 'lost'
  readonly createdAt: string
  readonly actionPoints: ActionPoints
  readonly journalEntries: readonly JournalEntry[]
  readonly muralLinks: readonly MuralLink[]
  readonly investigativeRelations: readonly InvestigativeRelation[]
  readonly hypotheses?: readonly InvestigationHypothesis[]
  readonly preparedOperation?: PreparedOperation
  readonly hasAttemptedOperationThisRound?: boolean
  readonly resolvedKeys: readonly string[]
  readonly decks: Readonly<Record<InvestigatorId, MatchDeck>>
  readonly preparedCardInstanceId: string | null
}

export interface CreateSoloMatchInput {
  readonly id: string
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly createdAt: string
  readonly nextRandomInt: (maxExclusive: number) => number
}

export function createSoloMatch(input: CreateSoloMatchInput): SoloMatch {
  if (input.activeInvestigatorId === input.supportInvestigatorId) {
    throw new Error('O investigador ativo e o apoio precisam ser diferentes.')
  }

  return {
    id: input.id,
    version: 0,
    mode: 'solo',
    activeInvestigatorId: input.activeInvestigatorId,
    supportInvestigatorId: input.supportInvestigatorId,
    round: 1,
    examinedLocationsThisRound: [],
    hasUsedPassiveThisRound: false,
    hasReceivedSocialBonusThisRound: false,
    hasSocialConnectionThisRound: false,
    hasUsedSocialConnectionThisRound: false,
    hasUsedPressLeakConversationThisRound: false,
    hasFreeConnectionThisRound: false,
    hasUsedFreeConnectionThisRound: false,
    currentLocationId: 'gallery',
    unlockedLocations: ['gallery', 'security', 'laboratory', 'office'],
    hasUsedFreeMoveThisRound: false,
    hasDiscardedCardThisRound: false,
    hasUsedSupportThisRound: false,
    status: 'active',
    createdAt: input.createdAt,
    actionPoints: actionPointsFor(input.activeInvestigatorId),
    journalEntries: [],
    muralLinks: [],
    investigativeRelations: [],
    hypotheses: [],
    preparedOperation: undefined,
    hasAttemptedOperationThisRound: false,
    resolvedKeys: [],
    decks: {
      [input.activeInvestigatorId]: createInvestigatorDeck(
        input.activeInvestigatorId,
        input.nextRandomInt,
      ),
      [input.supportInvestigatorId]: createInvestigatorDeck(
        input.supportInvestigatorId,
        input.nextRandomInt,
      ),
    } as Record<InvestigatorId, MatchDeck>,
    preparedCardInstanceId: null,
  }
}

export function actionPointsFor(investigatorId: InvestigatorId): ActionPoints {
  const pools: Record<InvestigatorId, ActionPoints> = {
    livia: { general: 5, specialty: 0, specialtyPoint: null },
    rafael: { general: 4, specialty: 1, specialtyPoint: 'technical' },
    isadora: { general: 4, specialty: 1, specialtyPoint: 'social' },
    otavio: { general: 3, specialty: 2, specialtyPoint: 'research' },
  }
  return pools[investigatorId]
}
import { createInvestigatorDeck, type MatchDeck } from './match-deck.js'
