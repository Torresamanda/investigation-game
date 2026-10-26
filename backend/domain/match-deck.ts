import type { InvestigatorId } from './match.js'

export const INITIAL_HAND_SIZE = 4

export interface MatchCard {
  readonly instanceId: string
  readonly definitionId: string
  readonly ownerId: InvestigatorId
  readonly cost: 0 | 1 | 2
  readonly originalCost?: 0 | 1 | 2
  readonly compatibleActions: readonly ('examine' | 'converse' | 'analyse' | 'research')[]
  readonly temporary?: boolean
}

const temporaryDefinitions = {
  'curator-agenda': { cost: 0, compatibleActions: ['research'] },
  'treatment-sheet': { cost: 1, compatibleActions: ['analyse'] },
  'guest-list': { cost: 1, compatibleActions: ['research'] },
  'patrol-map': { cost: 0, compatibleActions: ['research'] },
} as const satisfies Record<string, Omit<MatchCard, 'instanceId' | 'definitionId' | 'ownerId'>>

export interface MatchDeck {
  readonly drawPile: readonly MatchCard[]
  readonly discardPile: readonly MatchCard[]
  readonly hand: readonly MatchCard[]
}

const definitions: Record<InvestigatorId, readonly Omit<MatchCard, 'instanceId' | 'ownerId'>[]> = {
  livia: [
    { definitionId: 'ultraviolet-flashlight', cost: 1, compatibleActions: ['examine'] },
    { definitionId: 'trace-marker', cost: 0, compatibleActions: ['analyse'] },
    { definitionId: 'route-map', cost: 1, compatibleActions: ['research'] },
    { definitionId: 'access-credential', cost: 2, compatibleActions: ['research'] },
  ],
  rafael: [
    { definitionId: 'comparative-magnifier', cost: 1, compatibleActions: ['analyse'] },
    { definitionId: 'forensic-camera', cost: 1, compatibleActions: ['examine'] },
    { definitionId: 'custody-envelope', cost: 0, compatibleActions: ['analyse'] },
    { definitionId: 'trace-reagent', cost: 2, compatibleActions: ['analyse'] },
  ],
  isadora: [
    { definitionId: 'pocket-recorder', cost: 1, compatibleActions: ['converse'] },
    { definitionId: 'calculated-pause', cost: 0, compatibleActions: ['converse'] },
    { definitionId: 'marked-transcript', cost: 1, compatibleActions: ['analyse'] },
    { definitionId: 'contact-card', cost: 2, compatibleActions: ['research'] },
  ],
  otavio: [
    { definitionId: 'archive-box', cost: 1, compatibleActions: ['research'] },
    { definitionId: 'chronological-thread', cost: 1, compatibleActions: ['research'] },
    { definitionId: 'cross-reference', cost: 1, compatibleActions: ['analyse'] },
    { definitionId: 'institutional-seal', cost: 2, compatibleActions: ['research'] },
  ],
}

export function createInvestigatorDeck(
  investigatorId: InvestigatorId,
  nextRandomInt: (maxExclusive: number) => number,
): MatchDeck {
  const cards = definitions[investigatorId].flatMap((definition) =>
    [1, 2].map((copy) => ({
      ...definition,
      instanceId: `${investigatorId}:${definition.definitionId}:${copy}`,
      ownerId: investigatorId,
    })),
  )
  return drawToHand(
    { drawPile: shuffle(cards, nextRandomInt), discardPile: [], hand: [] },
    INITIAL_HAND_SIZE,
    nextRandomInt,
  )
}

export function drawToHand(
  deck: MatchDeck,
  handSize: number,
  nextRandomInt: (maxExclusive: number) => number,
): MatchDeck {
  let drawPile = [...deck.drawPile]
  let discardPile = [...deck.discardPile]
  const hand = [...deck.hand]
  while (hand.length < handSize) {
    if (!drawPile.length) {
      if (!discardPile.length) break
      drawPile = shuffle(discardPile, nextRandomInt)
      discardPile = []
    }
    const next = drawPile.shift()
    if (!next) break
    hand.push(next)
  }
  return { drawPile, discardPile, hand }
}

export function drawCardFromDeck(
  deck: MatchDeck,
  nextRandomInt: (maxExclusive: number) => number,
): {
  readonly deck: MatchDeck
  readonly card?: MatchCard
} {
  let drawPile = [...deck.drawPile]
  let discardPile = [...deck.discardPile]
  const hand = [...deck.hand]

  if (!drawPile.length && hand.length) {
    const [card, ...remainingHand] = hand
    return {
      deck: { ...deck, hand: remainingHand },
      ...(card ? { card } : {}),
    }
  }

  if (!drawPile.length && discardPile.length) {
    drawPile = shuffle(discardPile, nextRandomInt)
    discardPile = []
  }

  const [card, ...remainingDrawPile] = drawPile
  return {
    deck: { ...deck, drawPile: remainingDrawPile, discardPile },
    ...(card ? { card } : {}),
  }
}

export function refreshHandForTurn(
  deck: MatchDeck,
  handSize: number,
  nextRandomInt: (maxExclusive: number) => number,
  ownerId?: InvestigatorId,
): MatchDeck {
  const temporaryCards = deck.hand.filter(
    (card) => card.temporary || (ownerId !== undefined && card.ownerId !== ownerId),
  )
  const regularHandCards = deck.hand.filter(
    (card) => !card.temporary && (ownerId === undefined || card.ownerId === ownerId),
  )
  const refreshedDeck = drawToHand(
    {
      drawPile: shuffle([...deck.drawPile, ...regularHandCards], nextRandomInt),
      discardPile: deck.discardPile,
      hand: [],
    },
    handSize,
    nextRandomInt,
  )
  return { ...refreshedDeck, hand: [...refreshedDeck.hand, ...temporaryCards] }
}

export function discardFromHand(deck: MatchDeck, instanceId: string): MatchDeck {
  const cardIndex = deck.hand.findIndex((card) => card.instanceId === instanceId)
  if (cardIndex === -1) throw new Error('A carta precisa estar na mão do investigador.')
  const hand = [...deck.hand]
  const [discarded] = hand.splice(cardIndex, 1)
  return { drawPile: deck.drawPile, discardPile: [...deck.discardPile, discarded!], hand }
}

export function recycleCardFromHand(
  holderDeck: MatchDeck,
  ownerDeck: MatchDeck,
  instanceId: string,
): { readonly holderDeck: MatchDeck; readonly ownerDeck: MatchDeck } {
  const cardIndex = holderDeck.hand.findIndex((card) => card.instanceId === instanceId)
  if (cardIndex === -1) throw new Error('A carta precisa estar na mão do investigador.')

  const holderHand = [...holderDeck.hand]
  const [recycledCard] = holderHand.splice(cardIndex, 1)
  if (!recycledCard) throw new Error('A carta precisa estar na mão do investigador.')
  const cardToDiscard = restoreOriginalCardCost(recycledCard)

  const updatedHolderDeck = { ...holderDeck, hand: holderHand }
  if (recycledCard.temporary) {
    return holderDeck === ownerDeck
      ? { holderDeck: updatedHolderDeck, ownerDeck: updatedHolderDeck }
      : { holderDeck: updatedHolderDeck, ownerDeck }
  }

  if (holderDeck === ownerDeck) {
    const updatedDeck = {
      ...updatedHolderDeck,
      discardPile: [...ownerDeck.discardPile, cardToDiscard],
    }
    return { holderDeck: updatedDeck, ownerDeck: updatedDeck }
  }

  return {
    holderDeck: updatedHolderDeck,
    ownerDeck: { ...ownerDeck, discardPile: [...ownerDeck.discardPile, cardToDiscard] },
  }
}

export function addTemporaryCardToHand(
  deck: MatchDeck,
  definitionId: keyof typeof temporaryDefinitions,
  ownerId: InvestigatorId,
): MatchDeck {
  const definition = temporaryDefinitions[definitionId]
  const instanceId = `temporary:${definitionId}:${ownerId}`
  if (
    [...deck.hand, ...deck.drawPile, ...deck.discardPile].some(
      (card) => card.instanceId === instanceId,
    )
  ) {
    return deck
  }
  return {
    ...deck,
    hand: [...deck.hand, { instanceId, definitionId, ownerId, temporary: true, ...definition }],
  }
}

function shuffle<T>(items: readonly T[], nextRandomInt: (maxExclusive: number) => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = nextRandomInt(index + 1)
    ;[result[index], result[target]] = [result[target]!, result[index]!]
  }
  return result
}

export function restoreOriginalCardCost(card: MatchCard): MatchCard {
  if (card.originalCost === undefined) return card
  const { originalCost, ...cardWithoutDiscount } = card
  return { ...cardWithoutDiscount, cost: originalCost }
}
