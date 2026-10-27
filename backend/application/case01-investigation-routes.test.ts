import { describe, expect, it } from 'vitest'
import { MatchService } from './match-service.js'
import { InMemoryMatchRepository } from '../infrastructure/persistence/in-memory-match-repository.js'
import type { LocationId, SoloMatch } from '../domain/match.js'

type RouteEvidence = 'e3-confirmed' | 'e4-confirmed'

function createRouteScenario() {
  const repository = new InMemoryMatchRepository()
  let generatedId = 0
  const service = new MatchService(
    repository,
    () => new Date('2026-10-27T12:00:00.000Z'),
    () => `case01-test-${++generatedId}`,
  )
  const created = service.createSoloMatch({
    activeInvestigatorId: 'livia',
    supportInvestigatorId: 'rafael',
  })
  repository.save({
    ...created,
    round: 3,
    currentLocationId: 'gallery',
    actionPoints: { general: 30, specialty: 0, specialtyPoint: null },
    resolvedKeys: [],
  })

  return { repository, service, matchId: created.id }
}

function saveAtLocation(
  repository: InMemoryMatchRepository,
  matchId: string,
  locationId: LocationId,
): SoloMatch {
  const match = repository.findById(matchId)
  if (!match) throw new Error('Partida de teste não encontrada.')
  return repository.save({ ...match, currentLocationId: locationId })
}

describe('Case 01 investigation routes', () => {
  it.each([
    ['security records', 'e3-confirmed'],
    ['service corridor', 'e4-confirmed'],
  ] as const)(
    'reaches the correct closure through the %s route without a prepared card',
    (_routeName, routeEvidence: RouteEvidence) => {
      const { repository, service, matchId } = createRouteScenario()
      service.resolveAction({ matchId, action: 'examine', locationId: 'gallery' })
      service.resolveAction({ matchId, action: 'examine', locationId: 'gallery' })
      service.resolveAction({ matchId, action: 'analyse', locationId: 'gallery' })

      if (routeEvidence === 'e3-confirmed') {
        saveAtLocation(repository, matchId, 'security')
        service.resolveAction({ matchId, action: 'research', locationId: 'security' })
        service.resolveAction({ matchId, action: 'research', locationId: 'security' })
        service.resolveAction({ matchId, action: 'analyse', locationId: 'security' })
        service.resolveAction({ matchId, action: 'analyse', locationId: 'security' })
      } else {
        service.resolveAction({ matchId, action: 'examine', locationId: 'gallery' })
        saveAtLocation(repository, matchId, 'security')
        service.resolveAction({ matchId, action: 'analyse', locationId: 'security' })
        saveAtLocation(repository, matchId, 'service-corridor')
        service.resolveAction({ matchId, action: 'examine', locationId: 'service-corridor' })
      }

      const matchWithEvidence = repository.findById(matchId)
      if (!matchWithEvidence) throw new Error('Partida de teste não encontrada.')
      const evidenceByKey = new Map(
        matchWithEvidence.journalEntries
          .filter((entry) => entry.caseEvidenceKey)
          .map((entry) => [entry.caseEvidenceKey, entry.id]),
      )
      const meansEntryId = evidenceByKey.get('e1-confirmed')
      const opportunityEntryId = evidenceByKey.get('e2-confirmed')
      const linkEntryId = evidenceByKey.get(routeEvidence)
      if (!meansEntryId || !opportunityEntryId || !linkEntryId) {
        throw new Error('A rota não produziu os três eixos confirmados esperados.')
      }

      service.createInvestigativeCrossing({
        matchId,
        fromClueId: meansEntryId,
        toClueId: opportunityEntryId,
      })
      service.createInvestigativeCrossing({
        matchId,
        fromClueId: opportunityEntryId,
        toClueId: linkEntryId,
      })

      expect(repository.findById(matchId)?.hypotheses).toMatchObject([
        { id: 'case01-primary-operation', status: 'sustained' },
      ])
      expect(service.getAvailableOperations(matchId).map((operation) => operation.id)).toContain(
        'preserve-the-evidence',
      )
      expect(repository.findById(matchId)?.preparedCardInstanceId).toBeNull()

      service.prepareOperation(matchId, 'preserve-the-evidence')
      expect(service.resolveOperation(matchId).status).toBe('won')
    },
  )
})
