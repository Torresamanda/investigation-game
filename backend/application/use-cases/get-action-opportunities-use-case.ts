import type {
  ActionOpportunities,
  BasicInvestigationAction,
} from '../../../shared/contracts/investigation-opportunity.js'
import { MatchNotFoundError } from '../../domain/errors.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import type { MatchRepository } from '../ports/match-repository.js'

export class GetActionOpportunitiesUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  execute(matchId: string): ActionOpportunities {
    const match = this.matchRepository.findById(matchId)
    if (!match) throw new MatchNotFoundError()

    const getOpportunity = (action: BasicInvestigationAction) =>
      this.caseContentRepository.getActionOpportunity(match, action, match.currentLocationId)
    return {
      examine: getOpportunity('examine'),
      analyse: getOpportunity('analyse'),
      research: getOpportunity('research'),
    }
  }
}
