import { describe, expect, it } from 'vitest'
import { createDeck, discardFromHand, drawToHand, type DeckCard } from './deck'

interface TestCard extends DeckCard {
  readonly label: string
}

const cards: readonly TestCard[] = [
  { instanceId: 'one', label: 'Um' },
  { instanceId: 'two', label: 'Dois' },
  { instanceId: 'three', label: 'Três' },
  { instanceId: 'four', label: 'Quatro' },
]

describe('deck', () => {
  it('compra somente o necessário para completar a mão', () => {
    const deck = drawToHand(createDeck(cards), 3, () => 0)
    const afterDiscard = discardFromHand(deck, 'two')

    const refilled = drawToHand(afterDiscard, 3, () => 0)

    expect(refilled.hand).toHaveLength(3)
    expect(refilled.discardPile).toEqual([cards[1]])
    expect(refilled.drawPile).toHaveLength(0)
  })

  it('embaralha o descarte apenas quando o monte de compra acaba', () => {
    const startingDeck = {
      drawPile: [] as readonly TestCard[],
      discardPile: [cards[0]!, cards[1]!],
      hand: [cards[2]!],
    }

    const refilled = drawToHand(startingDeck, 3, () => 0)

    expect(refilled.hand).toHaveLength(3)
    expect(refilled.discardPile).toEqual([])
    expect(refilled.drawPile).toEqual([])
  })

  it('não permite descartar uma carta que não está na mão', () => {
    expect(() => discardFromHand(createDeck(cards), 'one')).toThrow(
      'A carta precisa estar na mão do investigador.',
    )
  })
})
