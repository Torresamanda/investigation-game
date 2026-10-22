import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'

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
      decks: { livia: { hand: unknown[] } }
    }>()
    expect(match.round).toBe(1)
    expect(match.decks.livia.hand).toHaveLength(4)

    const retrieve = await app.inject({ method: 'GET', url: `/api/matches/${match.id}` })
    expect(retrieve.statusCode).toBe(200)
    expect(retrieve.json()).toMatchObject({ id: match.id, mode: 'solo' })
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
    expect(resolve.json()).toMatchObject({
      actionPoints: { general: 3 },
      journalEntries: [{ title: 'Fechadura de emergência' }],
    })
  })

  it('encerra o turno e restaura os PA para a rodada seguinte', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/matches',
      payload: { activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' },
    })
    const match = create.json<{ id: string }>()

    const endTurn = await app.inject({ method: 'POST', url: `/api/matches/${match.id}/end-turn` })

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

    const options = await app.inject({
      method: 'GET',
      url: `/api/matches/${id}/conversations/marta?locationId=laboratory`,
    })
    expect(options.statusCode).toBe(200)
    expect(options.json<{ questions: unknown[] }>().questions).toHaveLength(3)

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
})
