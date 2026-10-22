import { canPayAction, spendActionPoints } from '../../../../shared/domain/action-points.js'
import type { ResolveActionCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import { discardFromHand } from '../../domain/match-deck.js'
import type { SoloMatch } from '../../domain/match.js'
import { DomainError, InvalidActionError, MatchNotFoundError } from '../../domain/errors.js'

export class ResolveActionUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  execute(command: ResolveActionCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    const activeDeck = match.decks[match.activeInvestigatorId]
    const card = match.preparedCardInstanceId
      ? activeDeck.hand.find((item) => item.instanceId === match.preparedCardInstanceId)
      : undefined
    if (
      match.preparedCardInstanceId &&
      (!card || !card.compatibleActions.includes(command.action))
    ) {
      throw new InvalidActionError('A carta não pode ser usada nesta ação.')
    }
    const cost = 2 + (card?.cost ?? 0)
    if (!canPayAction(match.actionPoints, { action: command.action, amount: cost })) {
      throw new DomainError('PA insuficientes para esta ação.')
    }

    const resolution = this.caseContentRepository.resolveAction(
      match,
      command.action,
      command.locationId,
    )
    const updated = {
      ...match,
      actionPoints: spendActionPoints(match.actionPoints, {
        action: command.action,
        amount: cost,
      }),
      decks: card
        ? {
            ...match.decks,
            [match.activeInvestigatorId]: discardFromHand(activeDeck, card.instanceId),
          }
        : match.decks,
      preparedCardInstanceId: null,
      journalEntries: [...match.journalEntries, resolution.entry],
      resolvedKeys: resolution.resolvedKey
        ? [...match.resolvedKeys, resolution.resolvedKey]
        : match.resolvedKeys,
    }
    this.repository.save(updated)
    return updated
  }
}
