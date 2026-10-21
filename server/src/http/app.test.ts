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
    const match = create.json<{ id: string; round: number }>()
    expect(match.round).toBe(1)

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
})
