import type { CaseContentRepository } from './ports/case-content-repository.js'
import type { MatchRepository } from './ports/match-repository.js'
import { appendInvestigationNotifications } from '../domain/investigation-notifications.js'
import type { SoloMatch } from '../domain/match.js'

export class NotificationRecordingMatchRepository implements MatchRepository {
  constructor(
    private readonly repository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  findById(id: string): SoloMatch | undefined {
    return this.repository.findById(id)
  }

  save(match: SoloMatch): SoloMatch {
    const previous = this.repository.findById(match.id)
    const updated = appendInvestigationNotifications(
      previous,
      match,
      previous ? this.caseContentRepository.getAvailableOperations(previous) : [],
      this.caseContentRepository.getAvailableOperations(match),
    )
    return this.repository.save(updated)
  }
}
