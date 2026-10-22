import type { InvestigatorId } from './match.js'

export const INITIAL_HAND_SIZE = 4

export interface MatchCard {
  readonly instanceId: string
  readonly definitionId: string
  readonly ownerId: InvestigatorId
}

export interface MatchDeck {
  readonly drawPile: readonly MatchCard[]
  readonly discardPile: readonly MatchCard[]
  readonly hand: readonly MatchCard[]
}

const definitions: Record<InvestigatorId, readonly string[]> = {
  livia: ['ultraviolet-flashlight', 'trace-marker', 'route-map', 'access-credential'],
  rafael: ['comparative-magnifier', 'forensic-camera', 'custody-envelope', 'trace-reagent'],
  isadora: ['pocket-recorder', 'calculated-pause', 'marked-transcript', 'contact-card'],
  otavio: ['archive-box', 'chronological-thread', 'cross-reference', 'institutional-seal'],
}

export function createInvestigatorDeck(investigatorId: InvestigatorId): MatchDeck {
  const cards = definitions[investigatorId].flatMap((definitionId) =>
    [1, 2].map((copy) => ({
      instanceId: `${investigatorId}:${definitionId}:${copy}`,
      definitionId,
      ownerId: investigatorId,
    })),
  )
  return drawToHand({ drawPile: shuffle(cards), discardPile: [], hand: [] }, INITIAL_HAND_SIZE)
}

export function drawToHand(deck: MatchDeck, handSize: number): MatchDeck {
  let drawPile = [...deck.drawPile]
  let discardPile = [...deck.discardPile]
  const hand = [...deck.hand]
  while (hand.length < handSize) {
    if (!drawPile.length) {
      if (!discardPile.length) break
      drawPile = shuffle(discardPile)
      discardPile = []
    }
    const next = drawPile.shift()
    if (!next) break
    hand.push(next)
  }
  return { drawPile, discardPile, hand }
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target]!, result[index]!]
  }
  return result
}
