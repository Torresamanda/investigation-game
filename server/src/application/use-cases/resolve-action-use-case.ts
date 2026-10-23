import {
  addSpecialtyPoints,
  canPayAction,
  investigatorActionCost,
  spendActionPoints,
} from '../../../../shared/domain/action-points.js'
import type { ResolveActionCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import { recycleCardFromHand } from '../../domain/match-deck.js'
import type { SoloMatch } from '../../domain/match.js'
import type { InvestigatorId } from '../../domain/match.js'
import { findClueConnectionCandidate } from '../../domain/clue-connection.js'
import {
  assertMatchIsActive,
  DomainError,
  InvalidActionError,
  MatchNotFoundError,
} from '../../domain/errors.js'

export class ResolveActionUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly caseContentRepository: CaseContentRepository,
  ) {}

  execute(command: ResolveActionCommand): SoloMatch {
    const match = this.repository.findById(command.matchId)
    if (!match) throw new MatchNotFoundError()
    assertMatchIsActive(match.status)
    if (command.locationId !== match.currentLocationId) {
      throw new InvalidActionError('O investigador precisa estar no local escolhido para agir.')
    }
    if (!match.unlockedLocations.includes(command.locationId)) {
      throw new InvalidActionError('Este local ainda não foi liberado.')
    }
    const activeDeck = match.decks[match.activeInvestigatorId]
    const card = match.preparedCardInstanceId
      ? activeDeck.hand.find((item) => item.instanceId === match.preparedCardInstanceId)
      : undefined
    if (
      match.preparedCardInstanceId &&
      (!card || !card.compatibleActions.includes(command.action))
    ) {
      throw new InvalidActionError('A carta não pode ser usada nesta ação.')
    }
    const connectionCandidate =
      match.activeInvestigatorId === 'otavio' && command.action === 'research'
        ? findClueConnectionCandidate(match)
        : undefined
    const cost = investigatorActionCost({
      investigatorId: match.activeInvestigatorId,
      action: command.action,
      locationId: command.locationId,
      examinedLocationsThisRound: match.examinedLocationsThisRound,
      preparedCardCost: card?.cost ?? 0,
      preparedCardId: card?.definitionId,
      hasMarkedClueForFollowUp: match.journalEntries.some(
        (entry) =>
          entry.type === 'clue' &&
          entry.locationId === command.locationId &&
          (entry.status === 'unconfirmed' || entry.status === 'indicio') &&
          entry.markedForFollowUp === true,
      ),
    })
    if (
      !canPayAction(match.actionPoints, {
        action: command.action,
        amount: cost,
      })
    ) {
      throw new DomainError('PA insuficientes para esta ação.')
    }

    const caseResolution = this.caseContentRepository.resolveAction(
      match,
      command.action,
      command.locationId,
    )
    if (caseResolution.errorMessage) throw new InvalidActionError(caseResolution.errorMessage)
    const resolution =
      match.round === 6 && connectionCandidate && caseResolution.entry.type === 'clue'
        ? {
            entry: {
              id: `journal-${match.journalEntries.length + 1}`,
              type: 'observation' as const,
              title: 'Exploração encerrada pelo prazo final',
              content:
                'A equipe organizou as evidências disponíveis sem iniciar uma nova linha de exploração.',
              locationId: command.locationId,
              round: match.round,
              status: 'note' as const,
            },
          }
        : caseResolution
    if (match.round === 6 && command.action !== 'analyse' && resolution.entry.type === 'clue') {
      throw new DomainError('O prazo final impede novas descobertas por exploração.')
    }
    const actionPoints = spendActionPoints(match.actionPoints, {
      action: command.action,
      amount: cost,
    })
    const usesRafaelPassive =
      match.activeInvestigatorId === 'rafael' &&
      command.action === 'analyse' &&
      !match.hasUsedPassiveThisRound &&
      resolution.entry.type === 'clue' &&
      (resolution.entry.status === 'unconfirmed' || resolution.entry.status === 'indicio') &&
      isPhysicalEvidenceLocation(command.locationId)
    const resolvedEntry = usesRafaelPassive
      ? {
          ...resolution.entry,
          status: 'confirmed' as const,
          ...(resolution.resolvedKey === 'gallery-lock'
            ? { caseEvidenceKey: 'e1-confirmed' as const }
            : {}),
          content: `${resolution.entry.content} Rafael confirmou o vestígio na análise pericial.`,
        }
      : resolution.entry.caseEvidenceKey || !isConfirmedCaseEvidence(resolution.resolvedKey)
        ? resolution.entry
        : { ...resolution.entry, caseEvidenceKey: resolution.resolvedKey }
    const finalResolvedEntry =
      resolvedEntry.type === 'clue' && resolvedEntry.status === 'confirmed'
        ? { ...resolvedEntry, markedForFollowUp: false }
        : resolvedEntry
    const journalEntries = match.journalEntries.map((entry) =>
      clearConsumedFollowUpMark(
        resolution.journalEntryUpdates?.find((updated) => updated.id === entry.id) ?? entry,
        command.locationId,
        finalResolvedEntry,
      ),
    )
    journalEntries.push(finalResolvedEntry)
    const revealsPreservedPerimeterDetail =
      match.round === 1 &&
      command.action === 'examine' &&
      command.locationId === 'gallery' &&
      !match.examinedLocationsThisRound.includes('gallery')
    if (revealsPreservedPerimeterDetail) {
      journalEntries.push({
        id: `journal-${journalEntries.length + 1}`,
        type: 'observation',
        title: 'Detalhe do perímetro preservado',
        content:
          'A borda interna do painel conserva marcas recentes de pressão; não há sinal de dano na face externa.',
        locationId: 'gallery',
        round: match.round,
        status: 'note',
      })
    }
    for (const entry of resolution.additionalEntries ?? []) {
      journalEntries.push({ ...entry, id: `journal-${journalEntries.length + 1}` })
    }
    const resolvedKeys = [...match.resolvedKeys]
    if (resolution.resolvedKey) resolvedKeys.push(resolution.resolvedKey)
    for (const key of resolution.resolvedKeys ?? []) {
      if (!resolvedKeys.includes(key)) resolvedKeys.push(key)
    }
    if (usesRafaelPassive && resolution.resolvedKey === 'gallery-lock') {
      resolvedKeys.push('e1-confirmed')
    }

    let updatedActionPoints = actionPoints
    let receivedSocialBonus = false
    if (
      match.activeInvestigatorId === 'isadora' &&
      !match.hasReceivedSocialBonusThisRound &&
      finalResolvedEntry.status === 'refuted' &&
      match.journalEntries.some((entry) => entry.isadoraMarkedContestable)
    ) {
      updatedActionPoints = addSpecialtyPoints(updatedActionPoints, 'social', 1)
      receivedSocialBonus = true
    }

    if (connectionCandidate) {
      journalEntries.push({
        id: `journal-${journalEntries.length + 1}`,
        type: 'observation',
        title: 'Conexão de Otávio',
        content: `“${connectionCandidate.confirmedEntry.title}” se relaciona a “${connectionCandidate.pendingEntry.title}”. Reavalie ${locationName(connectionCandidate.pendingEntry.locationId)} para verificar essa ligação.`,
        locationId: command.locationId,
        round: match.round,
        status: 'note',
        relatedEntryIds: [
          connectionCandidate.confirmedEntry.id,
          connectionCandidate.pendingEntry.id,
        ],
      })
      resolvedKeys.push(connectionCandidate.key)
    }

    const journalConnections = [...match.journalConnections]
    if (connectionCandidate) {
      addFormalConnection(journalConnections, {
        id: `journal-connection:${[connectionCandidate.confirmedEntry.id, connectionCandidate.pendingEntry.id].sort().join(':')}`,
        fromClueId: connectionCandidate.confirmedEntry.id,
        toClueId: connectionCandidate.pendingEntry.id,
        round: match.round,
      })
    }
    if (resolution.journalConnection) {
      addFormalConnection(journalConnections, {
        ...resolution.journalConnection,
        round: match.round,
      })
    }

    const updated: SoloMatch = {
      ...match,
      actionPoints: updatedActionPoints,
      decks: card
        ? recyclePreparedCard(match, activeDeck, card.instanceId, card.ownerId)
        : match.decks,
      preparedCardInstanceId: null,
      journalEntries,
      journalConnections,
      resolvedKeys,
      examinedLocationsThisRound:
        command.action === 'examine' &&
        !match.examinedLocationsThisRound.includes(command.locationId)
          ? [...match.examinedLocationsThisRound, command.locationId]
          : match.examinedLocationsThisRound,
      hasUsedPassiveThisRound: match.hasUsedPassiveThisRound || usesRafaelPassive,
      hasReceivedSocialBonusThisRound: match.hasReceivedSocialBonusThisRound || receivedSocialBonus,
      unlockedLocations: [
        ...match.unlockedLocations,
        ...(resolution.resolvedKey === 'gallery-service-door' ||
        resolution.resolvedKeys?.includes('gallery-service-door')
          ? ['service-corridor' as const]
          : []),
        ...(resolution.unlockedLocationIds ?? []),
      ].filter((locationId, index, all) => all.indexOf(locationId) === index),
    }
    this.repository.save(updated)
    return updated
  }
}

function isConfirmedCaseEvidence(
  key: string | undefined,
): key is NonNullable<SoloMatch['journalEntries'][number]['caseEvidenceKey']> {
  return (
    key === 'e1-confirmed' ||
    key === 'e2-confirmed' ||
    key === 'e3-confirmed' ||
    key === 'e4-confirmed' ||
    key === 'e5-confirmed' ||
    key === 'e6-confirmed'
  )
}

function isPhysicalEvidenceLocation(locationId: ResolveActionCommand['locationId']): boolean {
  return (
    locationId === 'gallery' || locationId === 'laboratory' || locationId === 'service-corridor'
  )
}

function locationName(locationId: ResolveActionCommand['locationId']): string {
  const names: Record<ResolveActionCommand['locationId'], string> = {
    gallery: 'Galeria Principal',
    security: 'Sala de Segurança',
    laboratory: 'Laboratório de Restauração',
    office: 'Escritório da Curadoria',
    'service-corridor': 'Corredor de Serviço',
  }
  return names[locationId]
}

function clearConsumedFollowUpMark(
  entry: SoloMatch['journalEntries'][number],
  locationId: ResolveActionCommand['locationId'],
  resolvedEntry: SoloMatch['journalEntries'][number],
): SoloMatch['journalEntries'][number] {
  const isConfirmedInLocation =
    entry.type === 'clue' && entry.locationId === locationId && entry.status === 'confirmed'
  const actionConfirmedInLocation =
    resolvedEntry.type === 'clue' &&
    resolvedEntry.locationId === locationId &&
    resolvedEntry.status === 'confirmed'
  return entry.markedForFollowUp && (isConfirmedInLocation || actionConfirmedInLocation)
    ? { ...entry, markedForFollowUp: false }
    : entry
}

function addFormalConnection(
  connections: SoloMatch['journalConnections'][number][],
  candidate: SoloMatch['journalConnections'][number],
): void {
  const exists = connections.some(
    (connection) =>
      (connection.fromClueId === candidate.fromClueId &&
        connection.toClueId === candidate.toClueId) ||
      (connection.fromClueId === candidate.toClueId &&
        connection.toClueId === candidate.fromClueId),
  )
  if (!exists) connections.push(candidate)
}

function recyclePreparedCard(
  match: SoloMatch,
  holderDeck: SoloMatch['decks'][SoloMatch['activeInvestigatorId']],
  instanceId: string,
  ownerId: InvestigatorId,
): SoloMatch['decks'] {
  const ownerDeck = match.decks[ownerId]
  const recycled = recycleCardFromHand(holderDeck, ownerDeck, instanceId)
  return {
    ...match.decks,
    [match.activeInvestigatorId]: recycled.holderDeck,
    [ownerId]: recycled.ownerDeck,
  }
}
