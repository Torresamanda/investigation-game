import { describe, expect, it } from 'vitest'
import { MatchService } from '../match-service.js'
import { InMemoryMatchRepository } from '../../infrastructure/persistence/in-memory-match-repository.js'
import { MatchPresenter } from '../../presenters/match-presenter.js'
import type { SoloMatch } from '../../domain/match.js'

function createSupportedDossier() {
  const repository = new InMemoryMatchRepository()
  const service = new MatchService(repository, undefined, () => 'accusation-test')
  const created = service.createSoloMatch({
    activeInvestigatorId: 'livia',
    supportInvestigatorId: 'rafael',
  })
  const match: SoloMatch = {
    ...created,
    round: 5,
    canAccuse: true,
    actionPoints: { general: 5, specialty: 0, specialtyPoint: null },
    journalEntries: [
      {
        id: 'means-clue',
        type: 'clue',
        title: 'Pista dos meios',
        content: 'Confirmada.',
        locationId: 'gallery',
        round: 3,
        status: 'confirmed',
        caseEvidenceKey: 'e1-confirmed',
      },
      {
        id: 'opportunity-clue',
        type: 'clue',
        title: 'Pista da oportunidade',
        content: 'Confirmada.',
        locationId: 'security',
        round: 3,
        status: 'confirmed',
        caseEvidenceKey: 'e2-confirmed',
      },
      {
        id: 'link-clue',
        type: 'clue',
        title: 'Pista do vínculo',
        content: 'Confirmada.',
        locationId: 'security',
        round: 4,
        status: 'confirmed',
        caseEvidenceKey: 'e3-confirmed',
      },
    ],
    journalConnections: [
      { id: 'connection-1', fromClueId: 'means-clue', toClueId: 'opportunity-clue', round: 4 },
      { id: 'connection-2', fromClueId: 'opportunity-clue', toClueId: 'link-clue', round: 4 },
    ],
  }
  repository.save(match)
  return { repository, service, match }
}

const accusation = {
  suspectId: 'raul' as const,
  meansClueId: 'means-clue',
  opportunityClueId: 'opportunity-clue',
  linkClueId: 'link-clue',
}

describe('AccuseSuspectUseCase', () => {
  it('aceita o dossiê sustentado, cobra 3 PA gerais e encerra em vitória', () => {
    const { service, match } = createSupportedDossier()

    const result = service.accuseSuspect({ matchId: match.id, ...accusation })

    expect(result).toMatchObject({ status: 'won', actionPoints: { general: 2 } })
    expect(MatchPresenter.toPublicDto(result).journalEntries[0]).not.toHaveProperty(
      'caseEvidenceKey',
    )
  })

  it('aceita a rota exploratória e documental E4 + E5 + E6', () => {
    const { repository, service, match } = createSupportedDossier()
    repository.save({
      ...match,
      journalEntries: match.journalEntries.map((entry) => ({
        ...entry,
        caseEvidenceKey:
          entry.id === 'means-clue'
            ? 'e5-confirmed'
            : entry.id === 'opportunity-clue'
              ? 'e6-confirmed'
              : 'e4-confirmed',
      })),
    })

    const result = service.accuseSuspect({ matchId: match.id, ...accusation })

    expect(result.status).toBe('won')
  })

  it('encerra em derrota sem revelar a solução quando a pessoa acusada está errada', () => {
    const { service, match } = createSupportedDossier()

    const result = service.accuseSuspect({ ...accusation, matchId: match.id, suspectId: 'marta' })

    expect(result).toMatchObject({ status: 'lost', actionPoints: { general: 2 } })
    expect(MatchPresenter.toPublicDto(result)).not.toHaveProperty('resolvedKeys')
  })

  it('encerra em derrota quando pistas confirmadas não sustentam os eixos escolhidos', () => {
    const { repository, service, match } = createSupportedDossier()
    repository.save({
      ...match,
      journalEntries: match.journalEntries.map((entry) =>
        entry.id === 'means-clue' ? { ...entry, caseEvidenceKey: 'e4-confirmed' } : entry,
      ),
    })

    const result = service.accuseSuspect({ matchId: match.id, ...accusation })

    expect(result.status).toBe('lost')
  })

  it('rejeita dossiê incompleto sem gastar PA ou encerrar a partida', () => {
    const { repository, service, match } = createSupportedDossier()
    repository.save({ ...match, journalConnections: match.journalConnections.slice(0, 1) })

    expect(() => service.accuseSuspect({ matchId: match.id, ...accusation })).toThrow(
      'O dossiê ainda não está sustentado.',
    )
    expect(service.getMatch(match.id)).toMatchObject({
      status: 'active',
      actionPoints: { general: 5 },
    })
  })

  it('exige pistas confirmadas selecionadas para cada eixo', () => {
    const { repository, service, match } = createSupportedDossier()
    repository.save({
      ...match,
      journalEntries: match.journalEntries.map((entry) =>
        entry.id === 'link-clue' ? { ...entry, status: 'unconfirmed' } : entry,
      ),
    })

    expect(() => service.accuseSuspect({ matchId: match.id, ...accusation })).toThrow(
      'O dossiê ainda não está sustentado.',
    )
    expect(service.getMatch(match.id)?.actionPoints.general).toBe(5)
  })

  it('rejeita IDs que não apontam para pistas confirmadas sem gastar PA', () => {
    const { service, match } = createSupportedDossier()

    expect(() =>
      service.accuseSuspect({ ...accusation, matchId: match.id, meansClueId: 'unknown-clue' }),
    ).toThrow('O dossiê ainda não está sustentado.')
    expect(service.getMatch(match.id)).toMatchObject({
      status: 'active',
      actionPoints: { general: 5 },
    })
  })

  it('exige os 3 PA gerais antes de aceitar ou encerrar a acusação', () => {
    const { repository, service, match } = createSupportedDossier()
    repository.save({ ...match, actionPoints: { ...match.actionPoints, general: 2 } })

    expect(() => service.accuseSuspect({ matchId: match.id, ...accusation })).toThrow(
      'São necessários 3 PA gerais para apresentar a acusação.',
    )
    expect(service.getMatch(match.id)).toMatchObject({
      status: 'active',
      actionPoints: { general: 2 },
    })
  })

  it('encerra como derrota ao concluir a Rodada 6 sem uma acusação vencedora', () => {
    const { repository, service, match } = createSupportedDossier()
    repository.save({ ...match, round: 6 })

    expect(service.endTurn(match.id)).toMatchObject({ status: 'lost', round: 6 })
  })
})
