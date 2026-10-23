import type { MatchRepository } from '../ports/match-repository.js'
import type { SoloMatch } from '../../domain/match.js'

export class GetMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  execute(matchId: string): SoloMatch | undefined {
    return this.repository.findById(matchId)
  }
}
