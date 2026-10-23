const privatePathRoots = new Set([
  'backend',
  '.git',
  '.env',
  'docs',
  'documents',
  'migrations',
  'node_modules',
  'server',
  'shared',
  'worker',
])

const privateFileNames = new Set([
  'agents.md',
  'package-lock.json',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'wrangler.jsonc',
])

export function targetsPrivateSource(pathname: string): boolean {
  const normalizedPath = decodePathname(pathname).replaceAll('\\', '/').toLowerCase()
  const segments = normalizedPath.split('/').filter(Boolean)
  const firstSegment = segments[0]
  return Boolean(
    firstSegment &&
    (privatePathRoots.has(firstSegment) ||
      (segments.length === 1 && privateFileNames.has(firstSegment))),
  )
}

function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}
