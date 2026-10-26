import type { PublicMatchDto, MatchJournalEntry } from '../../shared/contracts/match'
import type {
  InvestigatorId,
  InvestigationAction,
  LocationId,
  PersonId,
} from '../../shared/domain/identifiers'
import {
  clearMatchSession,
  getMatchSession,
  saveCurrentMatch,
  saveMatchSession,
} from './match-session'

export type { MatchJournalEntry }
export type RemoteMatch = PublicMatchDto

export interface ConversationQuestion {
  readonly id: string
  readonly text: string
  readonly cost: number
  readonly approach: 'inquiry' | 'pressure' | 'context'
  readonly canResolve: boolean
  readonly isEvidenceBlocked: boolean
}

export interface ConversationOptions {
  readonly personId: PersonId
  readonly personName: string
  readonly locationId: LocationId
  readonly questions: readonly ConversationQuestion[]
}

export interface AccusationSubmission {
  readonly suspectId: PersonId
  readonly meansClueId: string
  readonly opportunityClueId: string
  readonly linkClueId: string
}

interface ApiError {
  readonly message: string
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
const matchTokenHeader = 'x-match-token'

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await sendRequest(path, init)
  if (response.ok) return response.json() as Promise<T>

  const error = (await response.json().catch(() => null)) as ApiError | null
  throw new ApiRequestError(
    error?.message ?? 'Não foi possível comunicar com a investigação.',
    response.status,
  )
}

async function sendRequest(path: string, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    const headers = new Headers(init?.headers)
    if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
    })
  } catch {
    throw new Error('A API está indisponível. Verifique sua conexão e tente novamente.')
  }
  return response
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}

function matchSessionHeaders(matchId: string): HeadersInit {
  const token = getMatchSession(matchId)
  return token ? { [matchTokenHeader]: token } : {}
}

export const gameApi = {
  getMatch(matchId: string) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}`, {
      headers: matchSessionHeaders(matchId),
    })
  },

  async deleteMatch(matchId: string): Promise<void> {
    const response = await sendRequest(`/api/matches/${encodePathSegment(matchId)}`, {
      method: 'DELETE',
      headers: matchSessionHeaders(matchId),
    })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as ApiError | null
      throw new ApiRequestError(
        error?.message ?? 'Não foi possível excluir a partida.',
        response.status,
      )
    }
    clearMatchSession(matchId)
  },

  async createMatch(activeInvestigatorId: InvestigatorId, supportInvestigatorId: InvestigatorId) {
    const response = await sendRequest('/api/matches', {
      method: 'POST',
      body: JSON.stringify({ activeInvestigatorId, supportInvestigatorId }),
    })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as ApiError | null
      throw new ApiRequestError(
        error?.message ?? 'Não foi possível criar a partida.',
        response.status,
      )
    }
    const token = response.headers.get(matchTokenHeader)
    if (!token) throw new Error('A API não retornou uma sessão válida para a partida.')
    const match = (await response.json()) as RemoteMatch
    saveMatchSession(match.id, token)
    saveCurrentMatch(match.id)
    return match
  },

  resolveAction(matchId: string, action: InvestigationAction, locationId: LocationId) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action, locationId }),
      headers: matchSessionHeaders(matchId),
    })
  },

  createJournalConnection(matchId: string, fromClueId: string, toClueId: string) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}/connections`, {
      method: 'POST',
      body: JSON.stringify({ fromClueId, toClueId }),
      headers: matchSessionHeaders(matchId),
    })
  },

  accuse(matchId: string, accusation: AccusationSubmission) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}/accuse`, {
      method: 'POST',
      body: JSON.stringify(accusation),
      headers: matchSessionHeaders(matchId),
    })
  },

  moveInvestigator(matchId: string, locationId: LocationId) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}/move`, {
      method: 'POST',
      body: JSON.stringify({ locationId }),
      headers: matchSessionHeaders(matchId),
    })
  },

  endTurn(matchId: string) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}/end-turn`, {
      method: 'POST',
      headers: matchSessionHeaders(matchId),
    })
  },

  requestSupportCard(matchId: string) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}/support-card`, {
      method: 'POST',
      headers: matchSessionHeaders(matchId),
    })
  },

  discardCard(matchId: string, cardInstanceId: string) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}/discard-card`, {
      method: 'POST',
      body: JSON.stringify({ cardInstanceId }),
      headers: matchSessionHeaders(matchId),
    })
  },

  prepareCard(matchId: string, cardInstanceId: string | null) {
    return request<RemoteMatch>(`/api/matches/${encodePathSegment(matchId)}/prepared-card`, {
      method: 'PUT',
      body: JSON.stringify({ cardInstanceId }),
      headers: matchSessionHeaders(matchId),
    })
  },

  getConversationOptions(matchId: string, personId: string, locationId: LocationId) {
    const query = new URLSearchParams({ locationId })
    return request<ConversationOptions>(
      `/api/matches/${encodePathSegment(matchId)}/conversations/${encodePathSegment(personId)}?${query}`,
      { headers: matchSessionHeaders(matchId) },
    )
  },

  resolveConversation(
    matchId: string,
    personId: string,
    questionId: string,
    locationId: LocationId,
  ) {
    return request<RemoteMatch>(
      `/api/matches/${encodePathSegment(matchId)}/conversations/${encodePathSegment(personId)}/questions/${encodePathSegment(questionId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ locationId }),
        headers: matchSessionHeaders(matchId),
      },
    )
  },
}
