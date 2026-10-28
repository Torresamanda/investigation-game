import { describe, expect, it } from 'vitest'
import { investigatorIds } from '../../shared/domain/identifiers.js'
import { simulateCase01Route } from '../testing/case01-route-simulator.js'

describe('Case 01 route and budget simulator', () => {
  it.each(investigatorIds)(
    'wins the minimum route by Round 6 for %s after at least three non-decisive clues without cards',
    (investigatorId) => {
      const simulation = simulateCase01Route(investigatorId, 'minimum')

      expect(simulation.finalMatch.status).toBe('won')
      expect(simulation.finalMatch.round).toBeLessThanOrEqual(6)
      expect(simulation.nonDecisiveClueCount).toBeGreaterThanOrEqual(3)
      expect(simulation.usedCard).toBe(false)
      expect(simulation.finalMatch.preparedCardInstanceId).toBeNull()
    },
  )

  it.each(['livia', 'rafael'] as const)(
    'recovers from a refuted lead on the curiosity route for %s',
    (investigatorId) => {
      const simulation = simulateCase01Route(investigatorId, 'curiosity')

      expect(simulation.finalMatch.status).toBe('won')
      expect(simulation.finalMatch.round).toBeLessThanOrEqual(6)
      expect(simulation.nonDecisiveClueCount).toBeGreaterThanOrEqual(3)
      expect(simulation.usedCard).toBe(false)
    },
  )

  it.each(['livia', 'rafael'] as const)(
    'refutes a false lead without a prepared card for %s',
    (investigatorId) => {
      const simulation = simulateCase01Route(investigatorId, 'curiosity')

      expect(simulation.finalMatch.status).toBe('won')
      expect(simulation.finalMatch.journalEntries).toContainEqual(
        expect.objectContaining({ type: 'clue', status: 'refuted' }),
      )
      expect(simulation.usedCard).toBe(false)
    },
  )

  it('produces the same route outcome with a fixed random source', () => {
    const firstSimulation = simulateCase01Route('livia', 'curiosity')
    const secondSimulation = simulateCase01Route('livia', 'curiosity')

    expect(firstSimulation.finalMatch).toEqual(secondSimulation.finalMatch)
  })

  it('preserves the same action-point margin after the closure for every investigator', () => {
    const remainingBudgets = investigatorIds.map(
      (investigatorId) =>
        simulateCase01Route(investigatorId, 'minimum').remainingActionPointsAfterClosure,
    )

    expect(new Set(remainingBudgets).size).toBe(1)
    expect(remainingBudgets[0]).toBeGreaterThanOrEqual(3)
  })
})
