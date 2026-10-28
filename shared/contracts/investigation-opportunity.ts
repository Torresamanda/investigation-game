export type InvestigationOpportunityStatus = 'promising' | 'exploratory' | 'exhausted'

export interface InvestigationOpportunity {
  readonly status: InvestigationOpportunityStatus
  readonly message: string
}

export type BasicInvestigationAction = 'examine' | 'analyse' | 'research'

export type ActionOpportunities = Readonly<
  Record<BasicInvestigationAction, InvestigationOpportunity>
>
