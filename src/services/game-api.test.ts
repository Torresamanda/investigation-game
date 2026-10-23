import { beforeEach, describe, expect, it, vi } from 'vitest'
import { gameApi } from './game-api'
import { getCurrentMatch, getMatchSession } from './match-session'

describe('game API session authorization', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('stores the creation token and sends it on subsequent match requests', async () => {
    const token = 'a'.repeat(64)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'match-1' }), {
          status: 201,
          headers: { 'x-match-token': token },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'match-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await gameApi.createMatch('livia', 'rafael')
    await gameApi.getMatch('match-1')

    expect(getMatchSession('match-1')).toBe(token)
    expect(getCurrentMatch()).toBe('match-1')
    const requestOptions = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(new Headers(requestOptions.headers).get('x-match-token')).toBe(token)
  })
})
