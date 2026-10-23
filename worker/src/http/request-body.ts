const maximumRequestBodyBytes = 64 * 1024
const oversizedBody = Symbol('oversized-body')
const malformedBody = Symbol('malformed-body')

export type JsonRequestBody = Record<string, unknown> | undefined
export type RequestBodyResult = JsonRequestBody | typeof oversizedBody | typeof malformedBody

export async function readJsonBody(request: Request): Promise<RequestBodyResult> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumRequestBodyBytes)
    return oversizedBody
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > maximumRequestBodyBytes) return oversizedBody
  if (!rawBody) return undefined
  if (!request.headers.get('content-type')?.startsWith('application/json')) return malformedBody
  try {
    const body: unknown = JSON.parse(rawBody)
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : malformedBody
  } catch {
    return malformedBody
  }
}

export function isOversizedBody(body: RequestBodyResult): body is typeof oversizedBody {
  return body === oversizedBody
}

function isMalformedBody(body: RequestBodyResult): body is typeof malformedBody {
  return body === malformedBody
}

export function hasOnlyFields(
  body: RequestBodyResult,
  allowedFields: readonly string[],
): body is Record<string, unknown> {
  return (
    body !== undefined &&
    !isOversizedBody(body) &&
    !isMalformedBody(body) &&
    Object.keys(body).every((field) => allowedFields.includes(field))
  )
}
