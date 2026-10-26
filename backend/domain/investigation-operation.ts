import type { InvestigationHypothesis } from './investigation-hypothesis.js'

export interface OperationOption {
  readonly id: string
  readonly title: string
  readonly riskDescription: string
}

export interface PreparedOperation {
  readonly operationId: string
  readonly hypothesisId: string
  readonly preparedAtRound: number
}

export type OperationResolution = 'resolved' | 'incomplete'

export function canPrepareOperation(
  hypothesis: InvestigationHypothesis | undefined,
  operation: OperationOption | undefined,
): boolean {
  return hypothesis?.status === 'sustained' && Boolean(operation)
}

export function resolvePreparedOperation(
  preparation: PreparedOperation | undefined,
  hypothesis: InvestigationHypothesis | undefined,
): OperationResolution {
  return preparation &&
    hypothesis?.id === preparation.hypothesisId &&
    hypothesis.status === 'sustained'
    ? 'resolved'
    : 'incomplete'
}
