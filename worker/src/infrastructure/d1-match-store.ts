import type { SoloMatch } from '../../../server/src/domain/match.js'

export interface D1PreparedStatement {
  bind(...values: readonly unknown[]): D1PreparedStatement
  first<T>(): Promise<T | null>
  run(): Promise<{ readonly meta: { readonly changes: number } }>
}

export interface D1DatabaseConnection {
  prepare(query: string): D1PreparedStatement
}

interface StoredMatch {
  readonly state: string
  readonly version: number
}

export class MatchVersionConflictError extends Error {
  constructor() {
    super('A partida foi alterada em outra requisição. Tente novamente.')
    this.name = 'MatchVersionConflictError'
  }
}

export class D1MatchStore {
  constructor(private readonly database: D1DatabaseConnection) {}

  async findById(id: string): Promise<SoloMatch | undefined> {
    const stored = await this.database
      .prepare('SELECT state, version FROM matches WHERE id = ?')
      .bind(id)
      .first<StoredMatch>()
    return stored
      ? { ...(JSON.parse(stored.state) as SoloMatch), version: stored.version }
      : undefined
  }

  async save(match: SoloMatch): Promise<SoloMatch> {
    const existing = await this.findById(match.id)
    if (!existing) {
      await this.database
        .prepare('INSERT INTO matches (id, state, version) VALUES (?, ?, ?)')
        .bind(match.id, JSON.stringify(match), match.version)
        .run()
      return match
    }

    const savedMatch = { ...match, version: match.version + 1 }
    const result = await this.database
      .prepare(
        `UPDATE matches
         SET state = ?, version = ?
         WHERE id = ? AND version = ?`,
      )
      .bind(JSON.stringify(savedMatch), savedMatch.version, match.id, match.version)
      .run()
    if (result.meta.changes === 0) throw new MatchVersionConflictError()
    return savedMatch
  }
}
