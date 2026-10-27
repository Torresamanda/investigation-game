import {
  investigatorIds,
  type InvestigatorId,
  type LocationId,
} from '../../shared/domain/identifiers.js'
import { MatchService } from '../application/match-service.js'
import type { RandomGenerator } from '../application/ports/random-generator.js'
import type { JournalEntry, SoloMatch } from '../domain/match.js'
import { InMemoryMatchRepository } from '../infrastructure/persistence/in-memory-match-repository.js'

export type Case01RouteKind = 'minimum' | 'curiosity'

export interface Case01RouteSimulation {
  readonly finalMatch: SoloMatch
  readonly nonDecisiveClueCount: number
  readonly remainingActionPointsAfterClosure: number
  readonly usedCard: boolean
}

export function simulateCase01Route(
  activeInvestigatorId: InvestigatorId,
  routeKind: Case01RouteKind,
): Case01RouteSimulation {
  const repository = new InMemoryMatchRepository()
  let generatedId = 0
  const randomGenerator: RandomGenerator = { nextInt: () => 0 }
  const service = new MatchService(
    repository,
    () => new Date('2026-10-27T12:00:00.000Z'),
    () => `case01-simulation-${++generatedId}`,
    undefined,
    randomGenerator,
  )
  const supportInvestigatorId = investigatorIds.find(
    (investigatorId) => investigatorId !== activeInvestigatorId,
  )
  if (!supportInvestigatorId) throw new Error('Não há investigador de apoio disponível.')

  const initialMatch = service.createSoloMatch({ activeInvestigatorId, supportInvestigatorId })
  const matchId = initialMatch.id
  let usedCard = false
  const followsFalseLead =
    routeKind === 'curiosity' &&
    (activeInvestigatorId === 'livia' || activeInvestigatorId === 'rafael')

  const moveTo = (locationId: LocationId): void => {
    service.moveInvestigator(matchId, locationId)
  }
  const act = (action: 'examine' | 'analyse' | 'research', locationId: LocationId): void => {
    const previousMatch = repository.findById(matchId)
    const updatedMatch = service.resolveAction({ matchId, action, locationId })
    usedCard ||= Boolean(
      previousMatch &&
      updatedMatch.decks[activeInvestigatorId].discardPile.length >
        previousMatch.decks[activeInvestigatorId].discardPile.length,
    )
  }
  const endRound = (): void => {
    service.endTurn(matchId)
  }

  act('examine', 'gallery')
  endRound()

  moveTo('security')
  act('research', 'security')
  act('research', 'security')
  endRound()

  moveTo('gallery')
  act('analyse', 'gallery')
  if (followsFalseLead) {
    moveTo('laboratory')
    act('examine', 'laboratory')
  }
  endRound()

  moveTo('security')
  act('analyse', 'security')
  if (followsFalseLead) {
    moveTo('laboratory')
    act('analyse', 'laboratory')
  }
  endRound()

  if (followsFalseLead) moveTo('security')
  act('analyse', 'security')
  const matchWithEvidence = repository.findById(matchId)
  const evidenceIds = getConfirmedEvidenceIds(matchWithEvidence)
  assertEvidenceHasHypothesisMetadata(matchWithEvidence)
  service.createInvestigativeCrossing({
    matchId,
    fromClueId: evidenceIds.means,
    toClueId: evidenceIds.opportunity,
  })
  service.createInvestigativeCrossing({
    matchId,
    fromClueId: evidenceIds.opportunity,
    toClueId: evidenceIds.link,
  })
  service.prepareOperation(matchId, 'preserve-the-evidence')
  endRound()

  const finalMatch = service.resolveOperation(matchId)
  const nonDecisiveClueCount = finalMatch.journalEntries.filter(
    (entry) => entry.type === 'clue' && entry.status !== 'confirmed',
  ).length

  return {
    finalMatch,
    nonDecisiveClueCount,
    remainingActionPointsAfterClosure:
      finalMatch.actionPoints.general + finalMatch.actionPoints.specialty,
    usedCard,
  }
}

function assertEvidenceHasHypothesisMetadata(match: SoloMatch | undefined): void {
  if (!match) throw new Error('Partida de simulação não encontrada.')
  const confirmedEvidence = match.journalEntries.filter(
    (entry) => entry.type === 'clue' && entry.status === 'confirmed',
  )
  const missingMetadata = confirmedEvidence.filter(
    (entry) => !entry.evidenceAxes?.length || !entry.hypothesisThreadIds?.length,
  )
  if (missingMetadata.length) {
    throw new Error(`Evidências sem metadados de hipótese: ${JSON.stringify(missingMetadata)}.`)
  }
}

function getConfirmedEvidenceIds(match: SoloMatch | undefined): {
  readonly means: string
  readonly opportunity: string
  readonly link: string
} {
  if (!match) throw new Error('Partida de simulação não encontrada.')
  const findEvidenceId = (evidenceKey: NonNullable<JournalEntry['caseEvidenceKey']>): string => {
    const entry = match.journalEntries.find(
      (journalEntry) =>
        journalEntry.caseEvidenceKey === evidenceKey && journalEntry.status === 'confirmed',
    )
    if (!entry) throw new Error(`Evidência confirmada não encontrada: ${evidenceKey}.`)
    return entry.id
  }

  return {
    means: findEvidenceId('e1-confirmed'),
    opportunity: findEvidenceId('e2-confirmed'),
    link: findEvidenceId('e3-confirmed'),
  }
}
