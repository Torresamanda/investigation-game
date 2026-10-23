import { canPayAction, spendActionPoints } from '../../../shared/domain/action-points.js'
import type { LocationId } from '../../../shared/domain/identifiers.js'
import { assertMatchIsActive, DomainError, MatchNotFoundError } from '../../domain/errors.js'
import type { SoloMatch } from '../../domain/match.js'
import type { MatchRepository } from '../ports/match-repository.js'

export class MoveInvestigatorUseCase {
  constructor(private readonly repository: MatchRepository) {}

  execute(matchId: string, locationId: LocationId): SoloMatch {
    const match = this.repository.findById(matchId)
    if (!match) throw new MatchNotFoundError()
    assertMatchIsActive(match.status)
    if (!match.unlockedLocations.includes(locationId)) {
      throw new DomainError('Este local ainda não foi liberado.')
    }

    const costsActionPoint =
      match.hasUsedFreeMoveThisRound && locationId !== match.currentLocationId
    if (costsActionPoint && !canPayAction(match.actionPoints, { action: 'move', amount: 1 })) {
      throw new DomainError('PA insuficientes para se deslocar.')
    }

    const updated: SoloMatch = {
      ...match,
      currentLocationId: locationId,
      hasUsedFreeMoveThisRound:
        match.hasUsedFreeMoveThisRound || locationId !== match.currentLocationId,
      actionPoints: costsActionPoint
        ? spendActionPoints(match.actionPoints, { action: 'move', amount: 1 })
        : match.actionPoints,
    }
    return this.repository.save(updated)
  }
}
