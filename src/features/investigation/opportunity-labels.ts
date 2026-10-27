import type { InvestigationOpportunityStatus } from '../../../shared/contracts/investigation-opportunity'

export const opportunityStatusLabels: Record<InvestigationOpportunityStatus, string> = {
  promising: 'Oportunidade plausível',
  exploratory: 'Exploração',
  exhausted: 'Abordagem esgotada',
}
