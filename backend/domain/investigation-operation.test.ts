import { describe, expect, it } from 'vitest'
import {
  canPrepareOperation,
  resolvePreparedOperation,
  type OperationOption,
} from './investigation-operation.js'
import type { InvestigationHypothesis } from './investigation-hypothesis.js'

const operation: OperationOption = {
  id: 'follow-the-record',
  kind: 'closure',
  title: 'Seguir o registro',
  riskDescription: 'A operação pode expor uma inconsistência na linha de raciocínio.',
}

const sustainedHypothesis: InvestigationHypothesis = {
  id: 'route',
  status: 'sustained',
  evidence: [],
  connectionIds: ['connection-1', 'connection-2'],
  hasOperationalInconsistency: false,
}

describe('investigation operations', () => {
  it('allows verification from plausible hypotheses and closure from sustained hypotheses', () => {
    expect(canPrepareOperation(sustainedHypothesis, operation)).toBe(true)
    expect(
      canPrepareOperation(
        { ...sustainedHypothesis, status: 'plausible' },
        { ...operation, kind: 'verify' },
      ),
    ).toBe(true)
  })

  it('turns a stale or contested preparation into a recoverable incomplete operation', () => {
    expect(
      resolvePreparedOperation(
        { operationId: operation.id, hypothesisId: 'route', preparedAtRound: 5 },
        { ...sustainedHypothesis, status: 'contested', hasOperationalInconsistency: true },
      ),
    ).toBe('incomplete')
  })
})
