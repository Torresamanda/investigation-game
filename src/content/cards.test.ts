import { describe, expect, it } from 'vitest'
import { investigators } from './investigators'
import { createInvestigatorDeck, getInvestigatorCards } from './cards'

describe.each(investigators)('baralho de $name', (investigator) => {
  it('contém oito instâncias únicas, com duas cópias de quatro tipos e somente do dono', () => {
    const deck = createInvestigatorDeck(investigator.id)
    expect(deck).toHaveLength(8)
    expect(new Set(deck.map((card) => card.instanceId)).size).toBe(8)
    expect(new Set(deck.map((card) => card.definition.id)).size).toBe(4)
    expect(deck.every((card) => card.ownerId === investigator.id)).toBe(true)
    for (const definition of getInvestigatorCards(investigator.id)) {
      expect(deck.filter((card) => card.definition.id === definition.id)).toHaveLength(2)
    }
  })
})
