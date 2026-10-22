import { describe, expect, it } from 'vitest'
import { InMemoryMatchRepository, MatchService } from './match-service.js'

describe('MatchService', () => {
  it('cria uma partida solo com dupla fixa e estado inicial', () => {
    const service = new MatchService(
      new InMemoryMatchRepository(),
      () => new Date('2026-10-21T12:00:00.000Z'),
      () => 'match-1',
    )

    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    expect(match).toMatchObject({
      id: 'match-1',
      mode: 'solo',
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
      round: 1,
      status: 'active',
    })
    expect(service.getMatch(match.id)).toEqual(match)
    expect(match.decks.livia.hand).toHaveLength(4)
    expect(match.decks.rafael.hand).toHaveLength(4)
  })

  it('rejeita a mesma pessoa como ativa e apoio', () => {
    const service = new MatchService(new InMemoryMatchRepository())

    expect(() =>
      service.createSoloMatch({ activeInvestigatorId: 'livia', supportInvestigatorId: 'livia' }),
    ).toThrow('O investigador ativo e o apoio precisam ser diferentes.')
  })

  it('resolve descobertas da galeria e registra uma observação quando não há novidade', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    service.createSoloMatch({ activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' })

    const first = service.resolveAction({
      matchId: 'match-1',
      locationId: 'gallery',
      action: 'examine',
    })
    const second = service.resolveAction({
      matchId: 'match-1',
      locationId: 'gallery',
      action: 'examine',
    })
    service.endTurn('match-1')
    const third = service.resolveAction({
      matchId: 'match-1',
      locationId: 'gallery',
      action: 'examine',
    })

    expect(first.journalEntries[0]).toMatchObject({
      type: 'clue',
      title: 'Fechadura de emergência',
    })
    expect(second.journalEntries[1]).toMatchObject({ type: 'clue', title: 'Vestígio no pedestal' })
    expect(third.journalEntries[2]).toMatchObject({
      type: 'observation',
      title: 'Nenhuma descoberta nova',
    })
    expect(third.actionPoints.general).toBe(3)
  })

  it('mantém a mão no servidor ao avançar para a rodada seguinte', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const initialHand = match.decks.livia.hand.map((card) => card.instanceId)

    const updated = service.endTurn(match.id)

    expect(updated.decks.livia.hand.map((card) => card.instanceId)).toEqual(initialHand)
    expect(updated.decks.livia.hand).toHaveLength(4)
  })

  it('valida a carta preparada e a move para o descarte após uma ação compatível', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const card = match.decks.livia.hand[0]
    if (!card) throw new Error('A mão inicial precisa conter cartas para este cenário.')

    const updated = service.resolveAction({
      matchId: match.id,
      action: card.compatibleActions[0]!,
      locationId: 'gallery',
      cardInstanceId: card.instanceId,
    })

    expect(updated.decks.livia.hand).not.toContainEqual(card)
    expect(updated.decks.livia.discardPile).toContainEqual(card)
    expect(updated.actionPoints.general).toBe(3 - card.cost)
  })
})
