import type { InvestigatorId } from '../../shared/domain/identifiers.js'

const effectiveActionPointsPerRound = 5
const missionRounds = 6
const coreHypothesisCost = 13
const specialtyRouteSavings = 1

export interface InvestigatorBudget {
  readonly investigatorId: InvestigatorId
  readonly sustainedHypothesisCost: number
  readonly curiosityActionsBeforeRoundFive: number
  readonly remainingActionPointsAtRoundSix: number
}

export function calculateInvestigatorBudget(investigatorId: InvestigatorId): InvestigatorBudget {
  const sustainedHypothesisCost = coreHypothesisCost - specialtyRouteSavings
  const curiosityCost = 3 * 2
  const recoveryReserve = 2
  const operationCost = 2
  const falseLeadRefutationCost = 2
  const paidMoveCost = 1

  return {
    investigatorId,
    sustainedHypothesisCost,
    curiosityActionsBeforeRoundFive: Math.floor(
      (effectiveActionPointsPerRound * 4 - sustainedHypothesisCost) / 2,
    ),
    remainingActionPointsAtRoundSix:
      effectiveActionPointsPerRound * missionRounds -
      sustainedHypothesisCost -
      curiosityCost -
      recoveryReserve -
      operationCost -
      falseLeadRefutationCost -
      paidMoveCost,
  }
}
