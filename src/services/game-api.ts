import type { PublicMatchDto, MatchJournalEntry } from '../../shared/contracts/match'
import type {
  InvestigatorId,
  InvestigationAction,
  LocationId,
} from '../../shared/domain/identifiers'

export type { MatchJournalEntry }
export type RemoteMatch = PublicMatchDto

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
