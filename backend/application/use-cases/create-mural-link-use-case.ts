import type { CreateMuralLinkCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import { assertMatchIsActive, DomainError, MatchNotFoundError } from '../../domain/errors.js'
import type { SoloMatch } from '../../domain/match.js'
import { findConfirmedEvidenceRelation } from '../../domain/evidence-relation.js'

export class CreateMuralLinkUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly createId: () => string,
  ) {}

  execute(command: CreateMuralLinkCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    assertMatchIsActive(match.status)
    const relation = findConfirmedEvidenceRelation(
      match.journalEntries,
      command.fromClueId,
      command.toClueId,
    )
    if (!relation) {
      throw new DomainError('A ligação no mural exige duas pistas confirmadas e coerentes.')
    }
    if (
      match.muralLinks.some(
        (muralLink) =>
          (muralLink.fromClueId === command.fromClueId &&
            muralLink.toClueId === command.toClueId) ||
          (muralLink.fromClueId === command.toClueId && muralLink.toClueId === command.fromClueId),
      )
    ) {
      throw new DomainError('Essas pistas já estão ligadas no mural.')
    }
    const muralLink = {
      id: this.createId(),
      fromClueId: command.fromClueId,
      toClueId: command.toClueId,
      round: match.round,
    }
    const updated: SoloMatch = {
      ...match,
      muralLinks: [...match.muralLinks, muralLink],
    }
    return this.repository.save(updated)
  }
}
