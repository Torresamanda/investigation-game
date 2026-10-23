import { jsonResponse } from './json-response.js'

interface RateLimitResult {
  readonly success: boolean
}

export interface RateLimitBinding {
  limit(options: { readonly key: string }): Promise<RateLimitResult>
}

export interface ApiRateLimitEnvironment {
  readonly API_IP_RATE_LIMITER: RateLimitBinding
  readonly MATCH_SESSION_RATE_LIMITER: RateLimitBinding
}

const matchTokenHeader = 'x-match-token'

export async function enforceApiRateLimit(
  request: Request,
  environment: ApiRateLimitEnvironment,
): Promise<Response | undefined> {
  try {
    const ipResult = await environment.API_IP_RATE_LIMITER.limit({
      key: `ip:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`,
    })
    if (!ipResult.success) return tooManyRequestsResponse()

    const sessionToken = request.headers.get(matchTokenHeader)
    if (!sessionToken) return undefined
    const sessionResult = await environment.MATCH_SESSION_RATE_LIMITER.limit({
      key: `session:${sessionToken}`,
    })
    return sessionResult.success ? undefined : tooManyRequestsResponse()
  } catch {
    return jsonResponse({ message: 'A investigação está indisponível.' }, 503)
  }
}

function tooManyRequestsResponse(): Response {
  return jsonResponse(
    { message: 'Muitas requisições. Aguarde um instante e tente novamente.' },
    429,
    { 'retry-after': '60' },
  )
}
