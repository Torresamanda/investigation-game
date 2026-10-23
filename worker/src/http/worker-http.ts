import type { D1DatabaseConnection } from '../infrastructure/d1-match-store.js'
import { handleMatchRequest } from './match-routes.js'
import { jsonResponse } from './json-response.js'
import { enforceApiRateLimit, type ApiRateLimitEnvironment } from './rate-limit.js'

export interface WorkerEnvironment extends ApiRateLimitEnvironment {
  readonly ASSETS: { fetch(request: Request): Promise<Response> }
  readonly MATCHES_DB: D1DatabaseConnection
}

export async function handleWorkerRequest(
  request: Request,
  environment: WorkerEnvironment,
): Promise<Response> {
  const pathname = new URL(request.url).pathname
  if (pathname === '/health') return checkDatabaseHealth(environment.MATCHES_DB)
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = await enforceApiRateLimit(request, environment)
    return rateLimitResponse ?? handleMatchRequest(request, environment.MATCHES_DB)
  }
  return environment.ASSETS.fetch(request)
}

async function checkDatabaseHealth(database: D1DatabaseConnection): Promise<Response> {
  try {
    await database.prepare('SELECT 1').first()
    return jsonResponse({ status: 'ok' })
  } catch {
    return jsonResponse({ message: 'A investigação está indisponível.' }, 503)
  }
}
