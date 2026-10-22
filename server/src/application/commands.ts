import type {
  InvestigationAction,
  InvestigatorId,
  LocationId,
  PersonId,
} from '../../../shared/domain/identifiers.js'

export interface CreateMatchCommand {
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
}

export interface ResolveActionCommand {
  readonly matchId: string
  readonly action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>
  readonly locationId: LocationId
}

export interface ResolveConversationCommand {
  readonly matchId: string
  readonly personId: PersonId
  readonly locationId: LocationId
  readonly questionId: string
}
