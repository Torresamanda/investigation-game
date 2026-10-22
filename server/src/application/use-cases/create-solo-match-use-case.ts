import { randomUUID } from 'node:crypto'
import { createSoloMatch, type InvestigatorId, type SoloMatch } from '../../domain/match.js'
import type { MatchRepository } from '../ports/match-repository.js'

export interface CreateSoloMatchCommand {
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
}

export class CreateSoloMatchUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  execute(command: CreateSoloMatchCommand): SoloMatch {
    const match = createSoloMatch({
      id: this.createId(),
      activeInvestigatorId: command.activeInvestigatorId,
      supportInvestigatorId: command.supportInvestigatorId,
      createdAt: this.now().toISOString(),
    })
    this.repository.save(match)
    return match
  }
}
