import { describe, expect, it } from 'vitest'
import { canPayAction, spendActionPoints } from './action-points'

describe('action points', () => {
  it('reserva o ponto técnico para análise', () => {
    const points = { general: 4, specialty: 1, specialtyPoint: 'technical' as const }

    expect(canPayAction(points, { amount: 2, action: 'examine' })).toBe(true)
    expect(spendActionPoints(points, { amount: 2, action: 'examine' })).toEqual({
      general: 2,
      specialty: 1,
      specialtyPoint: 'technical',
    })
    expect(spendActionPoints(points, { amount: 2, action: 'analyse' })).toEqual({
      general: 3,
      specialty: 0,
      specialtyPoint: 'technical',
    })
  })

  it('rejeita uma ação sem pontos suficientes', () => {
    const points = { general: 1, specialty: 0, specialtyPoint: null }

    expect(canPayAction(points, { amount: 2, action: 'research' })).toBe(false)
    expect(() => spendActionPoints(points, { amount: 2, action: 'research' })).toThrow(
      'Pontos de ação insuficientes.',
    )
  })
})
