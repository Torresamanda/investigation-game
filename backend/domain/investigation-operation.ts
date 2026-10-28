import type { InvestigationHypothesis } from './investigation-hypothesis.js'

export interface OperationOption {
  readonly id: string
  readonly kind: 'verify' | 'closure'
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
  if (!hypothesis || !operation) return false
  return operation.kind === 'verify'
    ? hypothesis.status === 'plausible' || hypothesis.status === 'sustained'
    : hypothesis.status === 'sustained'
}

export function resolvePreparedOperation(
  preparation: PreparedOperation | undefined,
  hypothesis: InvestigationHypothesis | undefined,
): OperationResolution {
  return preparation &&
    hypothesis?.id === preparation.hypothesisId &&
    (hypothesis.status === 'plausible' || hypothesis.status === 'sustained')
    ? 'resolved'
    : 'incomplete'
}
