import { describe, expect, it, vi } from 'vitest'
import { handleWorkerRequest, type WorkerEnvironment } from './worker-http.js'
import type { D1DatabaseConnection, D1PreparedStatement } from '../infrastructure/d1-match-store.js'
import type { RateLimitBinding } from './rate-limit.js'

function successfulLimiter(): RateLimitBinding {
  return { limit: vi.fn().mockResolvedValue({ success: true }) }
}

function database(): D1DatabaseConnection {
  const statement: D1PreparedStatement = {
    bind: () => statement,
    first: async () => null,
    run: async () => ({ meta: { changes: 0 } }),
  }
  return { prepare: () => statement }
}

function environment(
  assetResponse = new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }),
) {
  const fetch = vi.fn().mockResolvedValue(assetResponse)
  return {
    environment: {
      ASSETS: { fetch },
      MATCHES_DB: database(),
      API_IP_RATE_LIMITER: successfulLimiter(),
      MATCH_SESSION_RATE_LIMITER: successfulLimiter(),
    } satisfies WorkerEnvironment,
    fetch,
  }
}

describe('worker production isolation', () => {
  it('serves only built assets with restrictive browser headers', async () => {
    const assets = environment()

    const response = await handleWorkerRequest(
      new Request('https://game.test/investigation'),
      assets.environment,
    )

    expect(assets.fetch).toHaveBeenCalledOnce()
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('cache-control')).toBe('no-cache')
  })

  it('does not expose repository paths through SPA fallback', async () => {
    const assets = environment()

    const response = await handleWorkerRequest(
      new Request('https://game.test/backend/domain/match.ts'),
      assets.environment,
    )

    expect(response.status).toBe(404)
    expect(assets.fetch).not.toHaveBeenCalled()
  })

  it('rejects encoded private paths and non-read static requests', async () => {
    const assets = environment()
    const encodedPath = await handleWorkerRequest(
      new Request('https://game.test/%64ocs/private/notes.md'),
      assets.environment,
    )
    const writeRequest = await handleWorkerRequest(
      new Request('https://game.test/logo.svg', { method: 'POST' }),
      assets.environment,
    )

    expect(encodedPath.status).toBe(404)
    expect(writeRequest.status).toBe(405)
    expect(writeRequest.headers.get('allow')).toBe('GET, HEAD')
    expect(assets.fetch).not.toHaveBeenCalled()
  })
})
