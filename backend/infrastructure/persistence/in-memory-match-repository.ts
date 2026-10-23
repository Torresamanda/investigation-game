import type { MatchRepository } from '../../application/ports/match-repository.js'
import type { SoloMatch } from '../../domain/match.js'

export class InMemoryMatchRepository implements MatchRepository {
  private readonly matches = new Map<string, SoloMatch>()

  save(match: SoloMatch): SoloMatch {
    this.matches.set(match.id, match)
    return match
  }

  findById(id: string): SoloMatch | undefined {
    return this.matches.get(id)
  }
}
