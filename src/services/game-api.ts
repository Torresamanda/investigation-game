import type { InvestigatorId } from '../content/investigators'
import type { InvestigationAction } from '../domain/game/action-points'
import type { LocationId } from '../content/case01'

export interface MatchJournalEntry {
  readonly id: string
  readonly type: 'clue' | 'observation' | 'statement'
  readonly title: string
  readonly content: string
  readonly locationId: LocationId
  readonly round: number
  readonly status: 'unconfirmed' | 'note' | 'recorded' | 'contestable' | 'blocked'
  readonly recordedWith?: 'pocket-recorder'
}

export interface ConversationQuestion {
  readonly id: string
  readonly text: string
  readonly cost: 0 | 1 | 2
  readonly approach: 'inquiry' | 'pressure' | 'context'
  readonly canResolve: boolean
}

export interface ConversationOptions {
  readonly personId: string
  readonly personName: string
  readonly locationId: LocationId
  readonly questionLimitReached: boolean
  readonly questions: readonly ConversationQuestion[]
}

export interface RemoteMatch {
  readonly id: string
  readonly preparedCardInstanceId: string | null
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly round: number
  readonly actionPoints: {
    readonly general: number
    readonly specialty: number
    readonly specialtyPoint: 'technical' | 'social' | 'research' | null
  }
  readonly journalEntries: readonly MatchJournalEntry[]
  readonly decks: Readonly<
    Partial<
      Record<
        InvestigatorId,
        { readonly hand: readonly { readonly instanceId: string; readonly definitionId: string }[] }
      >
    >
  >
}

interface ApiError {
  readonly message: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (response.ok) return response.json() as Promise<T>

  const error = (await response.json().catch(() => null)) as ApiError | null
  throw new Error(error?.message ?? 'Não foi possível comunicar com a investigação.')
}

export const gameApi = {
  createMatch(activeInvestigatorId: InvestigatorId, supportInvestigatorId: InvestigatorId) {
    return request<RemoteMatch>('/api/matches', {
      method: 'POST',
      body: JSON.stringify({ activeInvestigatorId, supportInvestigatorId }),
    })
  },
  resolveAction(matchId: string, action: InvestigationAction, locationId: LocationId) {
    return request<RemoteMatch>(`/api/matches/${matchId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action, locationId }),
    })
  },
  endTurn(matchId: string) {
    return request<RemoteMatch>(`/api/matches/${matchId}/end-turn`, { method: 'POST' })
  },
  prepareCard(matchId: string, cardInstanceId: string | null) {
    return request<RemoteMatch>(`/api/matches/${matchId}/prepared-card`, {
      method: 'PUT',
      body: JSON.stringify({ cardInstanceId }),
    })
  },
  getConversationOptions(matchId: string, personId: string, locationId: LocationId) {
    const query = new URLSearchParams({ locationId })
    return request<ConversationOptions>(
      `/api/matches/${matchId}/conversations/${personId}?${query}`,
    )
  },
  resolveConversation(
    matchId: string,
    personId: string,
    questionId: string,
    locationId: LocationId,
  ) {
    return request<RemoteMatch>(
      `/api/matches/${matchId}/conversations/${personId}/questions/${questionId}`,
      {
        method: 'POST',
        body: JSON.stringify({ locationId }),
      },
    )
  },
}
