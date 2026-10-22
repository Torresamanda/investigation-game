import { describe, expect, it } from 'vitest'
import {
  canPayAction,
  investigatorActionCost,
  spendActionPoints,
} from '../../../shared/domain/action-points'

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

  it('permite usar especialidade do investigador em uma carta compatível', () => {
    const points = { general: 0, specialty: 1, specialtyPoint: 'technical' as const }

    expect(
      canPayAction(points, {
        amount: 1,
        action: 'examine',
        specialtyEligible: true,
      }),
    ).toBe(true)
    expect(
      spendActionPoints(points, {
        amount: 1,
        action: 'examine',
        specialtyEligible: true,
      }),
    ).toEqual({ general: 0, specialty: 0, specialtyPoint: 'technical' })
  })

  it('calcula o desconto de Lívia e o custo de conexão de Otávio', () => {
    const sharedCost = {
      action: 'examine' as const,
      locationId: 'gallery' as const,
      examinedLocationsThisRound: [] as const,
      preparedCardCost: 0,
      canCreateConnection: false,
    }

    expect(investigatorActionCost({ investigatorId: 'livia', ...sharedCost })).toBe(1)
    expect(
      investigatorActionCost({
        investigatorId: 'livia',
        ...sharedCost,
        examinedLocationsThisRound: ['gallery'],
      }),
    ).toBe(2)
    expect(
      investigatorActionCost({
        investigatorId: 'otavio',
        ...sharedCost,
        action: 'research',
        canCreateConnection: true,
      }),
    ).toBe(3)
  })
})
