import { createSoloMatch, type InvestigatorId, type SoloMatch } from '../../domain/match.js'
import type { MatchRepository } from '../ports/match-repository.js'
import type { RandomGenerator } from '../ports/random-generator.js'

export interface CreateSoloMatchCommand {
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
}

export class CreateSoloMatchUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string,
    private readonly randomGenerator: RandomGenerator,
  ) {}

  execute(command: CreateSoloMatchCommand): SoloMatch {
    const match = createSoloMatch({
      id: this.createId(),
      activeInvestigatorId: command.activeInvestigatorId,
      supportInvestigatorId: command.supportInvestigatorId,
      createdAt: this.now().toISOString(),
      nextRandomInt: (maxExclusive) => this.randomGenerator.nextInt(maxExclusive),
    })
    return this.repository.save(match)
  }
}
