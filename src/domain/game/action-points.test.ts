import { describe, expect, it } from 'vitest'
import {
  calculateEffectiveActionCost,
  canPayAction,
  investigatorActionCost,
  spendActionPoints,
} from '../../../shared/domain/action-points'

describe('action points', () => {
  it('combina custo base, carta, sobretaxa e desconto antes de cobrar', () => {
    expect(
      calculateEffectiveActionCost({
        baseCost: 2,
        preparedCardCost: 1,
        surcharge: 1,
        discount: 2,
      }),
    ).toBe(2)
    expect(
      calculateEffectiveActionCost({
        baseCost: 1,
        preparedCardCost: 0,
        discount: 2,
      }),
    ).toBe(1)
    expect(calculateEffectiveActionCost({ baseCost: 0, minimumCost: 0 })).toBe(0)
  })

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

  it('calcula o desconto de Lívia sem adicionar custo obrigatório à pesquisa de Otávio', () => {
    const sharedCost = {
      action: 'examine' as const,
      locationId: 'gallery' as const,
      examinedLocationsThisRound: [] as const,
      preparedCardCost: 0,
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
      }),
    ).toBe(2)
  })

  it('desconta a próxima análise marcada e não a jogada que usa o marcador', () => {
    expect(
      investigatorActionCost({
        investigatorId: 'rafael',
        action: 'analyse',
        locationId: 'gallery',
        examinedLocationsThisRound: [],
        preparedCardCost: 0,
        preparedCardId: 'trace-marker',
      }),
    ).toBe(2)
    expect(
      investigatorActionCost({
        investigatorId: 'rafael',
        action: 'analyse',
        locationId: 'gallery',
        examinedLocationsThisRound: [],
        preparedCardCost: 0,
        hasMarkedClueForFollowUp: true,
      }),
    ).toBe(1)
  })
})
