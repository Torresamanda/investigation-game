import type { D1DatabaseConnection } from '../infrastructure/d1-match-store.js'
import { handleMatchRequest } from './match-routes.js'
import { jsonResponse } from './json-response.js'
import { targetsPrivateSource } from './private-path.js'
import { productionUnavailableResponse, secureProductionResponse } from './production-response.js'
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
  try {
    if (pathname === '/health')
      return secureProductionResponse(await checkDatabaseHealth(environment.MATCHES_DB))
    if (pathname.startsWith('/api/')) {
      const rateLimitResponse = await enforceApiRateLimit(request, environment)
      return secureProductionResponse(
        rateLimitResponse ?? (await handleMatchRequest(request, environment.MATCHES_DB)),
      )
    }
    if (targetsPrivateSource(pathname)) return secureProductionResponse(notFoundResponse())
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return secureProductionResponse(methodNotAllowedResponse())
    return secureProductionResponse(await environment.ASSETS.fetch(request))
  } catch {
    return secureProductionResponse(productionUnavailableResponse())
  }
}

async function checkDatabaseHealth(database: D1DatabaseConnection): Promise<Response> {
  try {
    await database.prepare('SELECT 1').first()
    return jsonResponse({ status: 'ok' })
  } catch {
    return jsonResponse({ message: 'A investigação está indisponível.' }, 503)
  }
}

function notFoundResponse(): Response {
  return jsonResponse({ message: 'Rota não encontrada.' }, 404)
}

function methodNotAllowedResponse(): Response {
  return jsonResponse({ message: 'Método não permitido.' }, 405, { allow: 'GET, HEAD' })
}
