import {
  createInvestigatorDeck,
  INITIAL_HAND_SIZE,
  type InvestigatorDeckCard,
} from '../../content/cards'
import type { InvestigatorId } from '../../../shared/domain/identifiers'
import {
  createDeck,
  discardFromHand,
  drawToHand,
  shuffle,
  type DeckState,
  type RandomSource,
} from '../../domain/game/deck'
import {
  canPayAction,
  spendActionPoints,
  type ActionPointPool,
  type InvestigationAction,
  type SpecialtyPoint,
} from '../../domain/game/action-points'

export const TOTAL_ROUNDS = 6

export interface SoloMission {
  readonly mode: 'solo'
  readonly round: number
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly actionPoints: ActionPointPool
  readonly decks: Readonly<Partial<Record<InvestigatorId, DeckState<InvestigatorDeckCard>>>>
}

export interface StartSoloMissionInput {
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
  readonly random?: RandomSource
}

export function startSoloMission({
  activeInvestigatorId,
  supportInvestigatorId,
  random = Math.random,
}: StartSoloMissionInput): SoloMission {
  if (activeInvestigatorId === supportInvestigatorId) {
    throw new Error('O investigador ativo e o apoio precisam ser diferentes.')
  }

  return {
    mode: 'solo',
    round: 1,
    activeInvestigatorId,
    supportInvestigatorId,
    actionPoints: actionPointsFor(activeInvestigatorId),
    decks: createMissionDecks([activeInvestigatorId, supportInvestigatorId], random),
  }
}

export function prepareNextRound(
  mission: SoloMission,
  random: RandomSource = Math.random,
): SoloMission {
  if (mission.round >= TOTAL_ROUNDS) throw new Error('A missão já alcançou o limite de rodadas.')

  return {
    ...mission,
    round: mission.round + 1,
    actionPoints: actionPointsFor(mission.activeInvestigatorId),
    decks: mapDecks(mission.decks, (deck) => drawToHand(deck, INITIAL_HAND_SIZE, random)),
  }
}

export function canPerformBasicAction(mission: SoloMission, action: InvestigationAction): boolean {
  return canPayAction(mission.actionPoints, { action, amount: 2 })
}

export function performBasicAction(mission: SoloMission, action: InvestigationAction): SoloMission {
  if (!canPerformBasicAction(mission, action)) {
    throw new Error('Pontos de ação insuficientes para esta ação.')
  }

  return {
    ...mission,
    actionPoints: spendActionPoints(mission.actionPoints, { action, amount: 2 }),
  }
}

export function canPerformActionWithCard(
  mission: SoloMission,
  action: InvestigationAction,
  cardInstanceId: string,
): boolean {
  const card = mission.decks[mission.activeInvestigatorId]?.hand.find(
    (item) => item.instanceId === cardInstanceId,
  )
  if (!card || !card.definition.compatibleActions.includes(action)) return false

  return canPayAction(mission.actionPoints, { action, amount: 2 + card.definition.cost })
}

export function performActionWithCard(
  mission: SoloMission,
  action: InvestigationAction,
  cardInstanceId: string,
): SoloMission {
  if (!canPerformActionWithCard(mission, action, cardInstanceId)) {
    throw new Error('A carta não pode ser usada com esta ação ou não há PA suficientes.')
  }

  const deck = mission.decks[mission.activeInvestigatorId]!
  const card = deck.hand.find((item) => item.instanceId === cardInstanceId)!

  return {
    ...mission,
    actionPoints: spendActionPoints(mission.actionPoints, {
      action,
      amount: 2 + card.definition.cost,
    }),
    decks: {
      ...mission.decks,
      [mission.activeInvestigatorId]: discardFromHand(deck, cardInstanceId),
    },
  }
}

function createMissionDecks(
  investigators: readonly InvestigatorId[],
  random: RandomSource,
): SoloMission['decks'] {
  return Object.fromEntries(
    investigators.map((investigatorId) => {
      const deck = createDeck(shuffle(createInvestigatorDeck(investigatorId), random))
      return [investigatorId, drawToHand(deck, INITIAL_HAND_SIZE, random)]
    }),
  ) as SoloMission['decks']
}

function mapDecks(
  decks: SoloMission['decks'],
  transform: (deck: DeckState<InvestigatorDeckCard>) => DeckState<InvestigatorDeckCard>,
): SoloMission['decks'] {
  const entries = Object.entries(decks).filter(
    (entry): entry is [InvestigatorId, DeckState<InvestigatorDeckCard>] => entry[1] !== undefined,
  )

  return Object.fromEntries(
    entries.map(([investigatorId, deck]) => [investigatorId, transform(deck)]),
  )
}

function actionPointsFor(investigatorId: InvestigatorId): ActionPointPool {
  const pools: Record<
    InvestigatorId,
    { general: number; specialty: number; specialtyPoint: SpecialtyPoint }
  > = {
    livia: { general: 5, specialty: 0, specialtyPoint: null },
    rafael: { general: 4, specialty: 1, specialtyPoint: 'technical' },
    isadora: { general: 4, specialty: 1, specialtyPoint: 'social' },
    otavio: { general: 3, specialty: 2, specialtyPoint: 'research' },
  }

  return pools[investigatorId]
}
