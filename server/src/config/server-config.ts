export interface ServerConfig {
  readonly port: number
  readonly databasePath: string
  readonly allowedOrigin: string
}

type Environment = Readonly<Record<string, string | undefined>>

export function readServerConfig(environment: Environment = process.env): ServerConfig {
  const isProduction = environment.NODE_ENV === 'production'
  const port = parsePort(environment.PORT)
  const databasePath = readRequiredEnvironmentValue(
    environment.DATABASE_PATH,
    'DATABASE_PATH',
    isProduction ? undefined : 'data/investigation.sqlite',
  )
  const allowedOrigin = parseOrigin(
    readRequiredEnvironmentValue(
      environment.ALLOWED_ORIGIN,
      'ALLOWED_ORIGIN',
      isProduction ? undefined : 'http://127.0.0.1:5173',
    ),
  )

  return { port, databasePath, allowedOrigin }
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value === '') return 3333
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT precisa ser um número inteiro entre 1 e 65535.')
  }
  return port
}

function readRequiredEnvironmentValue(
  value: string | undefined,
  name: string,
  fallback: string | undefined,
): string {
  const resolvedValue = value?.trim() || fallback
  if (!resolvedValue) throw new Error(`${name} precisa ser definida em produção.`)
  return resolvedValue
}

function parseOrigin(value: string): string {
  try {
    const parsedUrl = new URL(value)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error()
    const origin = parsedUrl.origin
    if (origin !== value.replace(/\/$/, '')) throw new Error()
    return origin
  } catch {
    throw new Error('ALLOWED_ORIGIN precisa conter uma origem HTTP(S) válida.')
  }
}
