import { describe, expect, it } from 'vitest'
import { refreshHandForTurn, type MatchCard, type MatchDeck } from './match-deck.js'

describe('refreshHandForTurn', () => {
  it('recolhe cartas não usadas, randomiza o monte e distribui quatro cartas', () => {
    const cards = Array.from({ length: 8 }, (_, index): MatchCard => ({
      instanceId: `livia:card:${index}`,
      definitionId: `card-${index}`,
      ownerId: 'livia',
      cost: 0,
      compatibleActions: ['examine'],
    }))
    const deck: MatchDeck = {
      drawPile: cards.slice(4),
      discardPile: [],
      hand: cards.slice(0, 4),
    }

    const refreshed = refreshHandForTurn(deck, 4, () => 0)

    expect(refreshed.hand.map((card) => card.instanceId)).toEqual([
      'livia:card:5',
      'livia:card:6',
      'livia:card:7',
      'livia:card:0',
    ])
    expect(refreshed.hand).toHaveLength(4)
    expect([...refreshed.hand, ...refreshed.drawPile]).toHaveLength(8)
  })

  it('preserva cartas temporárias fora das quatro cartas regulares da mão', () => {
    const regularCards = Array.from({ length: 8 }, (_, index): MatchCard => ({
      instanceId: `livia:regular:${index}`,
      definitionId: `regular-${index}`,
      ownerId: 'livia',
      cost: 0,
      compatibleActions: ['examine'],
    }))
    const temporaryCard: MatchCard = {
      instanceId: 'temporary:guest-list:livia',
      definitionId: 'guest-list',
      ownerId: 'livia',
      cost: 1,
      compatibleActions: ['research'],
      temporary: true,
    }
    const deck: MatchDeck = {
      drawPile: regularCards.slice(4),
      discardPile: [],
      hand: [...regularCards.slice(0, 4), temporaryCard],
    }

    const refreshed = refreshHandForTurn(deck, 4, () => 0)

    expect(refreshed.hand.filter((card) => !card.temporary)).toHaveLength(4)
    expect(refreshed.hand).toContainEqual(temporaryCard)
    expect(refreshed.hand).toHaveLength(5)
  })
})
