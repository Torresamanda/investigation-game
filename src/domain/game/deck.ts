export interface DeckCard {
  readonly instanceId: string
}

export interface DeckState<TCard extends DeckCard> {
  readonly drawPile: readonly TCard[]
  readonly discardPile: readonly TCard[]
  readonly hand: readonly TCard[]
}

export type RandomSource = () => number

export function shuffle<T>(cards: readonly T[], random: RandomSource = Math.random): readonly T[] {
  const shuffled = [...cards]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!]
  }

  return shuffled
}

export function createDeck<TCard extends DeckCard>(cards: readonly TCard[]): DeckState<TCard> {
  return { drawPile: [...cards], discardPile: [], hand: [] }
}

export function drawToHand<TCard extends DeckCard>(
  deck: DeckState<TCard>,
  handSize: number,
  random: RandomSource = Math.random,
): DeckState<TCard> {
  if (handSize < 0) throw new Error('O tamanho da mão não pode ser negativo.')

  let drawPile = [...deck.drawPile]
  let discardPile = [...deck.discardPile]
  const hand = [...deck.hand]

  while (hand.length < handSize) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break
      drawPile = [...shuffle(discardPile, random)]
      discardPile = []
    }

    const nextCard = drawPile.shift()
    if (!nextCard) break
    hand.push(nextCard)
  }

  return { drawPile, discardPile, hand }
}

export function discardFromHand<TCard extends DeckCard>(
  deck: DeckState<TCard>,
  instanceId: string,
): DeckState<TCard> {
  const cardIndex = deck.hand.findIndex((card) => card.instanceId === instanceId)
  if (cardIndex === -1) throw new Error('A carta precisa estar na mão do investigador.')

  const hand = [...deck.hand]
  const [discarded] = hand.splice(cardIndex, 1)

  return {
    drawPile: [...deck.drawPile],
    discardPile: [...deck.discardPile, discarded!],
    hand,
  }
}
