import type { SoloMatch } from '../../domain/match.js'

export interface MatchRepository {
  save(match: SoloMatch): SoloMatch
  findById(id: string): SoloMatch | undefined
}
