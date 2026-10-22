import { randomUUID } from 'node:crypto'
import {
  createSoloMatch,
  investigatorIds,
  actionPointsFor,
  type InvestigationAction,
  type InvestigatorId,
  type JournalEntry,
  type LocationId,
  type SoloMatch,
} from '../domain/match.js'
import { drawToHand, INITIAL_HAND_SIZE } from '../domain/match-deck.js'

export interface CreateMatchCommand {
  readonly activeInvestigatorId: InvestigatorId
  readonly supportInvestigatorId: InvestigatorId
}

export interface ResolveActionCommand {
  readonly matchId: string
  readonly action: InvestigationAction
  readonly locationId: LocationId
}

export interface MatchRepository {
  save(match: SoloMatch): void
  findById(id: string): SoloMatch | undefined
}

export class InMemoryMatchRepository implements MatchRepository {
  private readonly matches = new Map<string, SoloMatch>()

  save(match: SoloMatch) {
    this.matches.set(match.id, match)
  }

  findById(id: string) {
    return this.matches.get(id)
  }
}

export class MatchService {
  constructor(
    private readonly repository: MatchRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  createSoloMatch(command: CreateMatchCommand): SoloMatch {
    const match = createSoloMatch({
      id: this.createId(),
      activeInvestigatorId: command.activeInvestigatorId,
      supportInvestigatorId: command.supportInvestigatorId,
      createdAt: this.now().toISOString(),
    })
    this.repository.save(match)
    return match
  }

  getMatch(id: string): SoloMatch | undefined {
    return this.repository.findById(id)
  }

  resolveAction(command: ResolveActionCommand): SoloMatch {
    const match = this.getMatch(command.matchId)
    if (!match) throw new Error('Partida não encontrada.')
    if (match.actionPoints.general < 2) throw new Error('PA insuficientes para esta ação.')

    const resolution = resolveCaseAction(match, command.action, command.locationId)
    const updated = {
      ...match,
      actionPoints: { ...match.actionPoints, general: match.actionPoints.general - 2 },
      journalEntries: [...match.journalEntries, resolution.entry],
      resolvedKeys: resolution.resolvedKey
        ? [...match.resolvedKeys, resolution.resolvedKey]
        : match.resolvedKeys,
    }
    this.repository.save(updated)
    return updated
  }

  endTurn(matchId: string): SoloMatch {
    const match = this.getMatch(matchId)
    if (!match) throw new Error('Partida não encontrada.')
    if (match.round >= 6) throw new Error('A missão já alcançou o limite de rodadas.')

    const updated = {
      ...match,
      round: match.round + 1,
      actionPoints: actionPointsFor(match.activeInvestigatorId),
      decks: Object.fromEntries(
        Object.entries(match.decks).map(([investigatorId, deck]) => [
          investigatorId,
          drawToHand(deck, INITIAL_HAND_SIZE),
        ]),
      ) as SoloMatch['decks'],
    }
    this.repository.save(updated)
    return updated
  }
}

export function isInvestigatorId(value: unknown): value is InvestigatorId {
  return typeof value === 'string' && investigatorIds.includes(value as InvestigatorId)
}

export function isLocationId(value: unknown): value is LocationId {
  return (
    typeof value === 'string' && ['gallery', 'security', 'laboratory', 'office'].includes(value)
  )
}

export function isInvestigationAction(value: unknown): value is InvestigationAction {
  return typeof value === 'string' && ['examine', 'converse', 'analyse', 'research'].includes(value)
}

function resolveCaseAction(
  match: SoloMatch,
  action: InvestigationAction,
  locationId: LocationId,
): { entry: JournalEntry; resolvedKey?: string } {
  const entryId = thisEntryId(match)
  if (match.round === 1 && locationId === 'gallery' && action === 'examine') {
    if (!match.resolvedKeys.includes('gallery-lock')) {
      return {
        resolvedKey: 'gallery-lock',
        entry: {
          id: entryId,
          type: 'clue',
          title: 'Fechadura de emergência',
          content:
            'A fechadura interna não tem dano. A vitrine foi aberta com uma chave de emergência.',
          locationId,
          round: match.round,
          status: 'unconfirmed',
        },
      }
    }
    if (!match.resolvedKeys.includes('gallery-pedestal')) {
      return {
        resolvedKey: 'gallery-pedestal',
        entry: {
          id: entryId,
          type: 'clue',
          title: 'Vestígio no pedestal',
          content:
            'Resíduo escuro de óleo e pó fino segue em direção a uma porta de serviço lacrada.',
          locationId,
          round: match.round,
          status: 'unconfirmed',
        },
      }
    }
  }

  return {
    entry: {
      id: entryId,
      type: 'observation',
      title: 'Nenhuma descoberta nova',
      content:
        'Esta abordagem não revelou informação nova neste contexto. Tente outro local ou uma nova ação.',
      locationId,
      round: match.round,
      status: 'note',
    },
  }
}

function thisEntryId(match: SoloMatch): string {
  return `journal-${match.journalEntries.length + 1}`
}
