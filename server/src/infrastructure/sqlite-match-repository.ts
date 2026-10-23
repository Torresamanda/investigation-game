import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { MatchRepository } from '../application/ports/match-repository.js'
import type { SoloMatch } from '../domain/match.js'
import { DomainError } from '../domain/errors.js'

interface StoredMatch {
  readonly state: string
  readonly version: number
}

export class SqliteMatchRepository implements MatchRepository {
  private readonly database: DatabaseSync

  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
    this.database = new DatabaseSync(filename)
    this.database.exec('PRAGMA journal_mode = WAL;')
    this.database.exec('PRAGMA busy_timeout = 5000;')
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0
      )
    `)
    this.addVersionColumnToExistingDatabase()
  }

  save(match: SoloMatch): SoloMatch {
    const storedMatch = this.findStoredMatch(match.id)
    if (!storedMatch) {
      this.database
        .prepare('INSERT INTO matches (id, state, version) VALUES (?, ?, ?)')
        .run(match.id, JSON.stringify(match), match.version)
      return match
    }

    const nextVersion = match.version + 1
    const savedMatch = { ...match, version: nextVersion }
    const result = this.database
      .prepare(
        `UPDATE matches
         SET state = ?, version = ?
         WHERE id = ? AND version = ?`,
      )
      .run(JSON.stringify(savedMatch), nextVersion, match.id, match.version)
    if (result.changes === 0) {
      throw new DomainError('A partida foi alterada em outra requisição. Tente novamente.', 409)
    }
    return savedMatch
  }

  findById(id: string): SoloMatch | undefined {
    const stored = this.findStoredMatch(id)
    return stored
      ? { ...(JSON.parse(stored.state) as SoloMatch), version: stored.version }
      : undefined
  }

  close(): void {
    this.database.close()
  }

  private findStoredMatch(id: string): StoredMatch | undefined {
    return this.database.prepare('SELECT state, version FROM matches WHERE id = ?').get(id) as
      StoredMatch | undefined
  }

  private addVersionColumnToExistingDatabase(): void {
    const columns = this.database.prepare('PRAGMA table_info(matches)').all()
    if (!columns.some((column) => column.name === 'version')) {
      this.database.exec('ALTER TABLE matches ADD COLUMN version INTEGER NOT NULL DEFAULT 0;')
    }
  }
}
