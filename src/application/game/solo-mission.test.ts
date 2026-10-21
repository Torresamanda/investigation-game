import { describe, expect, it } from 'vitest'
import {
  canPerformBasicAction,
  canPerformActionWithCard,
  performBasicAction,
  performActionWithCard,
  prepareNextRound,
  startSoloMission,
  TOTAL_ROUNDS,
} from './solo-mission'

describe('solo mission', () => {
  it('inicia todos os baralhos com quatro cartas e PA do investigador ativo', () => {
    const mission = startSoloMission({
      activeInvestigatorId: 'rafael',
      supportInvestigatorId: 'livia',
      random: () => 0,
    })

    expect(mission.round).toBe(1)
    expect(mission.actionPoints).toEqual({ general: 4, specialty: 1, specialtyPoint: 'technical' })
    expect(Object.keys(mission.decks)).toEqual(['rafael', 'livia'])
    expect(Object.values(mission.decks).every((deck) => deck?.hand.length === 4)).toBe(true)
  })

  it('recompõe a mão e restaura os PA ao preparar uma nova rodada', () => {
    const mission = startSoloMission({
      activeInvestigatorId: 'otavio',
      supportInvestigatorId: 'livia',
      random: () => 0,
    })
    const withSpentHand = {
      ...mission,
      actionPoints: { general: 0, specialty: 0, specialtyPoint: 'research' as const },
      decks: {
        ...mission.decks,
        otavio: {
          ...mission.decks.otavio!,
          hand: mission.decks.otavio!.hand.slice(0, 2),
        },
      },
    }

    const nextRound = prepareNextRound(withSpentHand, () => 0)

    expect(nextRound.round).toBe(2)
    expect(nextRound.decks.otavio!.hand).toHaveLength(4)
    expect(nextRound.actionPoints).toEqual({ general: 3, specialty: 2, specialtyPoint: 'research' })
  })

  it('impede escolher o mesmo investigador como ativo e apoio', () => {
    expect(() =>
      startSoloMission({ activeInvestigatorId: 'livia', supportInvestigatorId: 'livia' }),
    ).toThrow('O investigador ativo e o apoio precisam ser diferentes.')
  })

  it('desconta PA ao realizar uma ação básica compatível', () => {
    const mission = startSoloMission({
      activeInvestigatorId: 'rafael',
      supportInvestigatorId: 'livia',
    })

    expect(canPerformBasicAction(mission, 'analyse')).toBe(true)
    expect(performBasicAction(mission, 'analyse').actionPoints).toEqual({
      general: 3,
      specialty: 0,
      specialtyPoint: 'technical',
    })
  })

  it('rejeita uma ação básica quando não há PA aplicável', () => {
    const mission = startSoloMission({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const withoutPoints = {
      ...mission,
      actionPoints: { general: 1, specialty: 0, specialtyPoint: null },
    }

    expect(canPerformBasicAction(withoutPoints, 'examine')).toBe(false)
    expect(() => performBasicAction(withoutPoints, 'examine')).toThrow(
      'Pontos de ação insuficientes para esta ação.',
    )
  })

  it('gasta a carta e seus PA somente em uma ação compatível', () => {
    const mission = startSoloMission({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
      random: () => 0,
    })
    const flashlight = mission.decks.livia!.hand.find(
      (card) => card.definition.id === 'ultraviolet-flashlight',
    )!

    expect(canPerformActionWithCard(mission, 'examine', flashlight.instanceId)).toBe(true)
    expect(canPerformActionWithCard(mission, 'research', flashlight.instanceId)).toBe(false)

    const resolved = performActionWithCard(mission, 'examine', flashlight.instanceId)

    expect(resolved.actionPoints.general).toBe(2)
    expect(resolved.decks.livia!.hand).not.toContainEqual(flashlight)
    expect(resolved.decks.livia!.discardPile).toContainEqual(flashlight)
  })

  it('não cria uma rodada depois do prazo final', () => {
    const mission = startSoloMission({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const finalRound = { ...mission, round: TOTAL_ROUNDS }

    expect(() => prepareNextRound(finalRound)).toThrow('A missão já alcançou o limite de rodadas.')
  })
})
