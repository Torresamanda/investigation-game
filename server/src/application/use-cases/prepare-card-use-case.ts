import type { MatchRepository } from '../ports/match-repository.js'
import type { SoloMatch } from '../../domain/match.js'

export class PrepareCardUseCase {
  constructor(private readonly repository: MatchRepository) {}

  execute(matchId: string, instanceId: string | null): SoloMatch {
    const match = this.repository.findById(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    if (
      instanceId &&
      !match.decks[match.activeInvestigatorId].hand.some((card) => card.instanceId === instanceId)
    ) {
      throw new Error('A carta precisa estar na mão do investigador.')
    }
    const updated = { ...match, preparedCardInstanceId: instanceId }
    this.repository.save(updated)
    return updated
  }
}
