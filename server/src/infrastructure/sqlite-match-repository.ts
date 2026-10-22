import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { MatchRepository } from '../application/match-service.js'
import type { SoloMatch } from '../domain/match.js'

interface StoredMatch {
  readonly state: string
}

export class SqliteMatchRepository implements MatchRepository {
  private readonly database: DatabaseSync

  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
    this.database = new DatabaseSync(filename)
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL
      )
    `)
  }

  save(match: SoloMatch) {
    this.database
      .prepare(
        `INSERT INTO matches (id, state) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET state = excluded.state`,
      )
      .run(match.id, JSON.stringify(match))
  }

  findById(id: string) {
    const stored = this.database.prepare('SELECT state FROM matches WHERE id = ?').get(id) as
      StoredMatch | undefined
    return stored ? (JSON.parse(stored.state) as SoloMatch) : undefined
  }
}
