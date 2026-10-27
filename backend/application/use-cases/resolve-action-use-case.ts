import {
  addSpecialtyPoints,
  canPayAction,
  investigatorActionCost,
  spendActionPoints,
} from '../../../shared/domain/action-points.js'
import type { ResolveActionCommand } from '../commands.js'
import type { MatchRepository } from '../ports/match-repository.js'
import type { CaseContentRepository } from '../ports/case-content-repository.js'
import { recycleCardFromHand } from '../../domain/match-deck.js'
import type { SoloMatch } from '../../domain/match.js'
import type { InvestigatorId } from '../../domain/match.js'
import { findOtavioInvestigativeCrossingCandidate } from '../../domain/otavio-investigative-crossing.js'
import { legacyCaseEvidenceMetadata } from '../../domain/coherent-connection.js'
import { synchronizeInvestigationHypotheses } from '../../domain/investigation-hypothesis.js'
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
    const crossingCandidate =
      match.activeInvestigatorId === 'otavio' && command.action === 'research'
        ? findOtavioInvestigativeCrossingCandidate(match)
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
      match.round === 6 && crossingCandidate && caseResolution.entry.type === 'clue'
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
    const resolvedEntryBase =
      resolution.entry.type === 'observation' && !resolution.additionalEntries?.length
        ? { ...resolution.entry, notificationSignal: 'action-failure' as const }
        : resolution.entry
    const actionPoints = spendActionPoints(match.actionPoints, {
      action: command.action,
      amount: cost,
    })
    const usesRafaelPassive =
      match.activeInvestigatorId === 'rafael' &&
      command.action === 'analyse' &&
      !match.hasUsedPassiveThisRound &&
      resolvedEntryBase.type === 'clue' &&
      (resolvedEntryBase.status === 'unconfirmed' || resolvedEntryBase.status === 'indicio') &&
      isPhysicalEvidenceLocation(command.locationId)
    const resolvedEntry = usesRafaelPassive
      ? {
          ...resolvedEntryBase,
          status: 'confirmed' as const,
          ...(resolution.resolvedKey === 'gallery-lock'
            ? { caseEvidenceKey: 'e1-confirmed' as const }
            : {}),
          content: `${resolvedEntryBase.content} Rafael confirmou o vestígio na análise pericial.`,
        }
      : resolution.entry.caseEvidenceKey || !isConfirmedCaseEvidence(resolution.resolvedKey)
        ? resolvedEntryBase
        : { ...resolvedEntryBase, caseEvidenceKey: resolution.resolvedKey }
    const finalResolvedEntry =
      resolvedEntry.type === 'clue' && resolvedEntry.status === 'confirmed'
        ? {
            ...resolvedEntry,
            markedForFollowUp: false,
            ...legacyCaseEvidenceMetadata(resolvedEntry.caseEvidenceKey),
          }
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

    if (crossingCandidate) {
      journalEntries.push({
        id: `journal-${journalEntries.length + 1}`,
        type: 'observation',
        title: 'Cruzamento investigativo de Otávio',
        content: `O cruzamento confirmou uma relação coerente entre “${crossingCandidate.fromEntry.title}” e “${crossingCandidate.toEntry.title}”.`,
        locationId: command.locationId,
        round: match.round,
        status: 'note',
        relatedEntryIds: [crossingCandidate.fromEntry.id, crossingCandidate.toEntry.id],
      })
      resolvedKeys.push(crossingCandidate.key)
    }

    const investigativeRelations = [...(match.investigativeRelations ?? [])]
    if (crossingCandidate) {
      investigativeRelations.push({
        id: `investigative-relation:${[crossingCandidate.fromEntry.id, crossingCandidate.toEntry.id].sort().join(':')}`,
        fromClueId: crossingCandidate.fromEntry.id,
        toClueId: crossingCandidate.toEntry.id,
        round: match.round,
        hypothesisThreadId: crossingCandidate.hypothesisThreadId,
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
      investigativeRelations,
      hypotheses: synchronizeInvestigationHypotheses(
        journalEntries.filter((entry) => entry.type === 'clue' && entry.status === 'confirmed'),
        investigativeRelations,
        match.hypotheses ?? [],
      ),
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
    return this.repository.save(updated)
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
