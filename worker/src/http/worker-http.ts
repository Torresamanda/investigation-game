import type { D1DatabaseConnection } from '../infrastructure/d1-match-store.js'
import { handleMatchRequest } from './match-routes.js'

export interface WorkerEnvironment {
  readonly ASSETS: { fetch(request: Request): Promise<Response> }
  readonly MATCHES_DB: D1DatabaseConnection
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
} as const

export async function handleWorkerRequest(
  request: Request,
  environment: WorkerEnvironment,
): Promise<Response> {
  const pathname = new URL(request.url).pathname
  if (pathname === '/health') return checkDatabaseHealth(environment.MATCHES_DB)
  if (pathname.startsWith('/api/')) return handleMatchRequest(request, environment.MATCHES_DB)
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

export function jsonResponse(
  payload: unknown,
  status = 200,
  additionalHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...jsonHeaders, ...additionalHeaders },
  })
}
