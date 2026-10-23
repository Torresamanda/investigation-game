import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { InMemoryMatchRepository } from '../infrastructure/persistence/in-memory-match-repository.js'
import { MatchService } from '../application/match-service.js'

describe('API de partidas', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('informa que o serviço está disponível', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('rejeita corpos nulos ou incompletos com 400 estruturado', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: 'null',
      headers: { 'content-type': 'application/json' },
    })
    expect(create.statusCode).toBe(400)
    expect(create.json()).toHaveProperty('message')

    const action = await app.inject({
      method: 'POST',
      url: '/api/matches/missing/actions',
      payload: 'null',
      headers: { 'content-type': 'application/json' },
    })
    expect(action.statusCode).toBe(400)
    expect(action.json()).toHaveProperty('message')
  })

  it('cria uma partida solo e permite recuperá-la', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })

    expect(create.statusCode).toBe(201)
    const match = create.json<{
      id: string
      round: number
      decks: {
        livia: { hand: unknown[]; drawPileCount: number; discardPileCount: number }
      }
    }>()
    expect(match.round).toBe(1)
    expect(match).toMatchObject({
      canAccuse: false,
      hasFreeConnectionThisRound: false,
      hasUsedFreeConnectionThisRound: false,
      hasUsedPressLeakConversationThisRound: false,
    })
    expect(match.decks.livia.hand).toHaveLength(4)
    expect(match.decks.livia.drawPileCount).toBe(4)
    expect(match.decks.livia.discardPileCount).toBe(0)
    expect(match.decks).not.toHaveProperty('rafael')
    expect(match).not.toHaveProperty('resolvedKeys')
    expect(match.decks.livia).not.toHaveProperty('drawPile')

    const retrieve = await app.inject({ method: 'GET', url: `/api/matches/${match.id}` })
    expect(retrieve.statusCode).toBe(200)
    expect(retrieve.json()).toMatchObject({ id: match.id, mode: 'solo' })
  })

  it('valida o formato do dossiê de acusação na rota', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const { id } = create.json<{ id: string }>()
    const invalid = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/accuse`,
      payload: {
        suspectId: 'unknown',
        meansClueId: 'clue-1',
        opportunityClueId: 'clue-2',
        linkClueId: 'clue-3',
      },
    })

    expect(invalid.statusCode).toBe(400)
    expect(invalid.json()).toHaveProperty('message')
  })

  it('apresenta o dossiê via API e não publica as chaves internas das evidências', async () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'accusation-api')
    app = createApp(service)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({
      ...match,
      round: 5,
      canAccuse: true,
      journalEntries: [
        {
          id: 'means',
          type: 'clue',
          title: 'Meios',
          content: '',
          locationId: 'gallery',
          round: 3,
          status: 'confirmed',
          caseEvidenceKey: 'e1-confirmed',
        },
        {
          id: 'opportunity',
          type: 'clue',
          title: 'Oportunidade',
          content: '',
          locationId: 'security',
          round: 3,
          status: 'confirmed',
          caseEvidenceKey: 'e2-confirmed',
        },
        {
          id: 'link',
          type: 'clue',
          title: 'Vínculo',
          content: '',
          locationId: 'security',
          round: 4,
          status: 'confirmed',
          caseEvidenceKey: 'e3-confirmed',
        },
      ],
      journalConnections: [
        { id: 'connection-1', fromClueId: 'means', toClueId: 'opportunity', round: 4 },
        { id: 'connection-2', fromClueId: 'opportunity', toClueId: 'link', round: 4 },
      ],
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/accuse`,
      payload: {
        suspectId: 'raul',
        meansClueId: 'means',
        opportunityClueId: 'opportunity',
        linkClueId: 'link',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'won', actionPoints: { general: 2 } })
    expect(response.json()).not.toHaveProperty('resolvedKeys')
    expect(response.json().journalEntries[0]).not.toHaveProperty('caseEvidenceKey')
  })

  it('resolve uma ação e devolve o diário atualizado', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const match = create.json<{ id: string }>()

    const resolve = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/actions`,
      payload: { action: 'examine', locationId: 'gallery' },
    })

    expect(resolve.statusCode).toBe(200)
    expect(resolve.json()).toMatchObject({ actionPoints: { general: 4 } })
    expect(
      resolve
        .json<{ journalEntries: { title: string }[] }>()
        .journalEntries.map((entry) => entry.title),
    ).toEqual(['Fechadura de emergência da vitrine', 'Detalhe do perímetro preservado'])
  })

  it('cria conexões formais por API, cobra PA e rejeita autos e duplicatas', async () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'connection-id')
    app = createApp(service)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({
      ...match,
      journalEntries: [
        {
          id: 'clue-one',
          type: 'clue',
          title: 'Registro apagado',
          content: 'Um bloco foi removido.',
          locationId: 'security',
          round: 1,
          status: 'confirmed',
        },
        {
          id: 'clue-two',
          type: 'clue',
          title: 'Retorno do cartão',
          content: 'O cartão foi usado às 22h16.',
          locationId: 'security',
          round: 1,
          status: 'unconfirmed',
        },
      ],
    })

    const created = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/connections`,
      payload: { fromClueId: 'clue-one', toClueId: 'clue-two' },
    })
    expect(created.statusCode).toBe(200)
    expect(created.json()).toMatchObject({
      actionPoints: { general: 4 },
      journalConnections: [
        { id: 'connection-id', fromClueId: 'clue-one', toClueId: 'clue-two', round: 1 },
      ],
    })

    const selfConnection = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/connections`,
      payload: { fromClueId: 'clue-one', toClueId: 'clue-one' },
    })
    expect(selfConnection.statusCode).toBe(400)

    const duplicate = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/connections`,
      payload: { fromClueId: 'clue-two', toClueId: 'clue-one' },
    })
    expect(duplicate.statusCode).toBe(400)
  })

  it('permite uma conexão gratuita na Rodada 5 apenas uma vez', async () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'free-connection')
    app = createApp(service)
    let match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({
      ...match,
      journalEntries: ['one', 'two', 'three'].map((id) => ({
        id,
        type: 'clue' as const,
        title: `Pista ${id}`,
        content: 'Evidência.',
        locationId: 'security' as const,
        round: 1,
        status: 'confirmed' as const,
      })),
    })
    for (let round = 1; round < 5; round += 1) match = service.endTurn(match.id)

    const first = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/connections`,
      payload: { fromClueId: 'one', toClueId: 'two' },
    })
    expect(first.statusCode).toBe(200)
    expect(first.json()).toMatchObject({
      actionPoints: { general: 5 },
      hasUsedFreeConnectionThisRound: true,
    })

    const second = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/connections`,
      payload: { fromClueId: 'one', toClueId: 'three' },
    })
    expect(second.statusCode).toBe(200)
    expect(second.json()).toMatchObject({ actionPoints: { general: 4 } })
  })

  it('concede a gratuidade de uma carta elegível somente quando ela está preparada', async () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'card-connection')
    app = createApp(service)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const deck = match.decks.livia
    const routeCard = [...deck.hand, ...deck.drawPile].find(
      (card) => card.definitionId === 'route-map',
    )
    if (!routeCard) throw new Error('Mapa de Rotas não foi criado.')
    repository.save({
      ...match,
      preparedCardInstanceId: routeCard.instanceId,
      journalEntries: [
        {
          id: 'first',
          type: 'clue',
          title: 'Primeira pista',
          content: 'Registro inicial.',
          locationId: 'security',
          round: 1,
          status: 'confirmed',
        },
        {
          id: 'second',
          type: 'clue',
          title: 'Segunda pista',
          content: 'Outro registro.',
          locationId: 'gallery',
          round: 1,
          status: 'unconfirmed',
        },
      ],
      decks: {
        ...match.decks,
        livia: {
          ...deck,
          hand: [
            ...deck.hand.filter((card) => card.instanceId !== routeCard.instanceId),
            routeCard,
          ],
          drawPile: deck.drawPile.filter((card) => card.instanceId !== routeCard.instanceId),
        },
      },
    })

    const created = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/connections`,
      payload: { fromClueId: 'first', toClueId: 'second' },
    })
    expect(created.statusCode).toBe(200)
    expect(created.json()).toMatchObject({
      actionPoints: { general: 5 },
      preparedCardInstanceId: null,
      decks: { livia: { discardPileCount: 1 } },
    })
  })

  it('move o investigador pelo endpoint validado e rejeita o corredor bloqueado', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const match = create.json<{ id: string }>()

    const move = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/move`,
      payload: { locationId: 'security' },
    })
    expect(move.statusCode).toBe(200)
    expect(move.json()).toMatchObject({
      currentLocationId: 'security',
      hasUsedFreeMoveThisRound: true,
      actionPoints: { general: 5 },
    })

    const lockedMove = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/move`,
      payload: { locationId: 'service-corridor' },
    })
    expect(lockedMove.statusCode).toBe(400)
  })

  it('rejeita conversar como uma ação de cenário', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const match = create.json<{ id: string }>()

    const resolve = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/actions`,
      payload: { action: 'converse', locationId: 'gallery' },
    })

    expect(resolve.statusCode).toBe(400)
    expect(resolve.json()).toEqual({ message: 'Ação ou local inválido.' })
  })

  it('aciona o apoio uma vez por rodada e restaura a disponibilidade ao encerrar o turno', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const { id } = create.json<{ id: string }>()

    const support = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/support-card`,
    })
    expect(support.statusCode).toBe(200)
    expect(support.json()).toMatchObject({
      hasUsedSupportThisRound: true,
      decks: { livia: { hand: expect.any(Array) } },
    })
    expect(support.json<{ decks: { livia: { hand: unknown[] } } }>().decks.livia.hand).toHaveLength(
      5,
    )
    expect(support.json().decks).not.toHaveProperty('rafael')

    const repeated = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/support-card`,
    })
    expect(repeated.statusCode).toBe(400)

    const endTurn = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/end-turn`,
    })
    expect(endTurn.json()).toMatchObject({ hasUsedSupportThisRound: false, round: 2 })
  })

  it('permite descartar uma carta e recompõe a mão imediatamente uma vez por rodada', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const match = create.json<{
      id: string
      decks: { livia: { hand: { instanceId: string }[] } }
    }>()

    const cardInstanceId = match.decks.livia.hand[0]?.instanceId
    if (!cardInstanceId) throw new Error('A mão inicial precisa conter uma carta.')
    const discard = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/discard-card`,
      payload: { cardInstanceId },
    })
    expect(discard.statusCode).toBe(200)
    expect(discard.json()).toMatchObject({ hasDiscardedCardThisRound: true })

    const endTurn = await app.inject({
      method: 'POST',
      url: `/api/matches/${match.id}/end-turn`,
    })
    expect(endTurn.statusCode).toBe(200)
    expect(endTurn.json()).toMatchObject({ round: 2, actionPoints: { general: 5 } })
  })

  it('consulta e resolve uma pergunta de conversa, atualizando PA e diário', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const { id } = create.json<{ id: string }>()

    await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/move`,
      payload: { locationId: 'laboratory' },
    })

    const options = await app.inject({
      method: 'GET',
      url: `/api/matches/${id}/conversations/marta?locationId=laboratory`,
    })
    expect(options.statusCode).toBe(200)
    expect(options.json<{ questions: { approach: string }[] }>().questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ approach: 'inquiry' }),
        expect.objectContaining({ approach: 'pressure' }),
        expect.objectContaining({ approach: 'context' }),
      ]),
    )

    const resolve = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/conversations/marta/questions/davi-interest`,
      payload: { locationId: 'laboratory' },
    })
    expect(resolve.statusCode).toBe(200)
    expect(resolve.json()).toMatchObject({
      actionPoints: { general: 4 },
      journalEntries: [{ type: 'statement', title: 'Declaração de Marta Lobo' }],
    })
  })

  it('rejeita pessoa fora do local, pergunta desconhecida e repetição', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const { id } = create.json<{ id: string }>()

    const unavailable = await app.inject({
      method: 'GET',
      url: `/api/matches/${id}/conversations/marta?locationId=gallery`,
    })
    expect(unavailable.statusCode).toBe(400)

    await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/move`,
      payload: { locationId: 'laboratory' },
    })

    const unknown = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/conversations/marta/questions/nope`,
      payload: { locationId: 'laboratory' },
    })
    expect(unknown.statusCode).toBe(400)

    const first = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/conversations/marta/questions/davi-interest`,
      payload: { locationId: 'laboratory' },
    })
    expect(first.statusCode).toBe(200)
    const repeated = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/conversations/marta/questions/davi-interest`,
      payload: { locationId: 'laboratory' },
    })
    expect(repeated.statusCode).toBe(400)
    expect(repeated.json()).toEqual({ message: 'Esta pergunta já foi resolvida.' })
  })

  it('rejeita uma segunda pergunta no mesmo turno', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const { id } = create.json<{ id: string }>()

    await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/move`,
      payload: { locationId: 'laboratory' },
    })

    await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/conversations/marta/questions/davi-interest`,
      payload: { locationId: 'laboratory' },
    })
    const second = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/conversations/marta/questions/technical-assessment`,
      payload: { locationId: 'laboratory' },
    })

    expect(second.statusCode).toBe(400)
    expect(second.json()).toEqual({ message: 'Você já fez uma pergunta neste turno.' })

    await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/move`,
      payload: { locationId: 'security' },
    })

    const otherPerson = await app.inject({
      method: 'POST',
      url: `/api/matches/${id}/conversations/raul/questions/museum-routine`,
      payload: { locationId: 'security' },
    })
    expect(otherPerson.statusCode).toBe(200)
  })
})
