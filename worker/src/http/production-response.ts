const productionHeaders = {
  'content-security-policy':
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), geolocation=(), microphone=()',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
} as const

export function secureProductionResponse(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(productionHeaders)) headers.set(name, value)
  if (headers.get('content-type')?.startsWith('text/html')) {
    headers.set('cache-control', 'no-cache')
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function productionUnavailableResponse(): Response {
  return new Response('A investigação está indisponível.', {
    status: 503,
    headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
  })
}
