import { describe, expect, it, vi } from 'vitest'
import { enforceApiRateLimit, type RateLimitBinding } from './rate-limit.js'

function limiter(success: boolean): RateLimitBinding {
  return { limit: vi.fn().mockResolvedValue({ success }) }
}

describe('API rate limit', () => {
  it('applies separate limits to the requester IP and match session', async () => {
    const ipLimiter = limiter(true)
    const sessionLimiter = limiter(true)

    const response = await enforceApiRateLimit(
      new Request('https://game.test/api/matches/match-1', {
        headers: { 'cf-connecting-ip': '203.0.113.10', 'x-match-token': 'token-1' },
      }),
      { API_IP_RATE_LIMITER: ipLimiter, MATCH_SESSION_RATE_LIMITER: sessionLimiter },
    )

    expect(response).toBeUndefined()
    expect(ipLimiter.limit).toHaveBeenCalledWith({ key: 'ip:203.0.113.10' })
    expect(sessionLimiter.limit).toHaveBeenCalledWith({ key: 'session:token-1' })
  })

  it('returns a safe retry response when either limit is exceeded', async () => {
    const response = await enforceApiRateLimit(new Request('https://game.test/api/matches'), {
      API_IP_RATE_LIMITER: limiter(false),
      MATCH_SESSION_RATE_LIMITER: limiter(true),
    })

    expect(response?.status).toBe(429)
    expect(response?.headers.get('retry-after')).toBe('60')
    await expect(response?.json()).resolves.toEqual({
      message: 'Muitas requisições. Aguarde um instante e tente novamente.',
    })
  })
})
