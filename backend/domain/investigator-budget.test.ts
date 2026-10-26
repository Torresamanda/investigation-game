import { describe, expect, it } from 'vitest'
import { investigatorIds } from '../../shared/domain/identifiers.js'
import { calculateInvestigatorBudget } from './investigator-budget.js'

describe('calculateInvestigatorBudget', () => {
  it.each(investigatorIds)(
    'keeps a recovery margin for %s without cards or support',
    (investigatorId) => {
      const budget = calculateInvestigatorBudget(investigatorId)

      expect(budget.sustainedHypothesisCost).toBeLessThanOrEqual(12)
      expect(budget.curiosityActionsBeforeRoundFive).toBeGreaterThanOrEqual(3)
      expect(budget.remainingActionPointsAtRoundSix).toBeGreaterThanOrEqual(5)
    },
  )
})
