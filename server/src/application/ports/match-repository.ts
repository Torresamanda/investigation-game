import type { SoloMatch } from '../../domain/match.js'

export interface MatchRepository {
  save(match: SoloMatch): void
  findById(id: string): SoloMatch | undefined
}
