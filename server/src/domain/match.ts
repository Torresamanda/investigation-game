export const investigatorIds = ['livia', 'rafael', 'isadora', 'otavio'] as const

export type InvestigatorId = (typeof investigatorIds)[number]

export const locationIds = ['gallery', 'security', 'laboratory', 'office'] as const
export type LocationId = (typeof locationIds)[number]

export const investigationActions = ['examine', 'converse', 'analyse', 'research'] as const
export type InvestigationAction = (typeof investigationActions)[number]

export interface ActionPoints {
  readonly general: number
  readonly specialty: number
  readonly specialtyPoint: 'technical' | 'social' | 'research' | null
}

export interface JournalEntry {
  readonly id: string
  readonly type: 'clue' | 'observation' | 'statement'
  readonly title: string
  readonly content: string
  readonly locationId: LocationId
  readonly round: number
  readonly status: 'unconfirmed' | 'note' | 'recorded' | 'contestable' | 'blocked'
  readonly recordedWith?: 'pocket-recorder'
}

export interface SoloMatch {
  readonly id: string
  readonly mode: 'solo'
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly round: number
  readonly status: 'active'
  readonly createdAt: string
  readonly actionPoints: ActionPoints
  readonly journalEntries: readonly JournalEntry[]
  readonly resolvedKeys: readonly string[]
  readonly decks: Readonly<Record<InvestigatorId, MatchDeck>>
  readonly preparedCardInstanceId: string | null
}

export interface CreateSoloMatchInput {
  readonly id: string
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly createdAt: string
}

export function createSoloMatch(input: CreateSoloMatchInput): SoloMatch {
  if (input.activeInvestigatorId === input.supportInvestigatorId) {
    throw new Error('O investigador ativo e o apoio precisam ser diferentes.')
  }

  return {
    id: input.id,
    mode: 'solo',
    activeInvestigatorId: input.activeInvestigatorId,
    supportInvestigatorId: input.supportInvestigatorId,
    round: 1,
    status: 'active',
    createdAt: input.createdAt,
    actionPoints: actionPointsFor(input.activeInvestigatorId),
    journalEntries: [],
    resolvedKeys: [],
    decks: {
      [input.activeInvestigatorId]: createInvestigatorDeck(input.activeInvestigatorId),
      [input.supportInvestigatorId]: createInvestigatorDeck(input.supportInvestigatorId),
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
