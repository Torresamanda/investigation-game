import Fastify from 'fastify'
import {
  InMemoryMatchRepository,
  isInvestigationAction,
  isInvestigatorId,
  isLocationId,
  MatchService,
} from '../application/match-service.js'

interface CreateMatchBody {
  activeInvestigatorId?: unknown
  supportInvestigatorId?: unknown
}

interface MatchParams {
  id: string
}

interface ResolveActionBody {
  action?: unknown
  locationId?: unknown
}

interface PrepareCardBody {
  cardInstanceId?: unknown
}

export function createApp(service = new MatchService(new InMemoryMatchRepository())) {
  const app = Fastify({ logger: false })

  app.get('/health', async () => ({ status: 'ok' }))

  app.post<{ Body: CreateMatchBody }>('/api/matches', async (request, reply) => {
    const { activeInvestigatorId, supportInvestigatorId } = request.body
    if (!isInvestigatorId(activeInvestigatorId) || !isInvestigatorId(supportInvestigatorId)) {
      return reply.code(400).send({ message: 'Investigadores inválidos.' })
    }

    try {
      const match = service.createSoloMatch({ activeInvestigatorId, supportInvestigatorId })
      return reply.code(201).send(match)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a partida.'
      return reply.code(400).send({ message })
    }
  })

  app.get<{ Params: MatchParams }>('/api/matches/:id', async (request, reply) => {
    const match = service.getMatch(request.params.id)
    if (!match) return reply.code(404).send({ message: 'Partida não encontrada.' })
    return match
  })

  app.post<{ Params: MatchParams; Body: ResolveActionBody }>(
    '/api/matches/:id/actions',
    async (request, reply) => {
      const { action, locationId } = request.body
      if (!isInvestigationAction(action) || !isLocationId(locationId)) {
        return reply.code(400).send({ message: 'Ação ou local inválido.' })
      }

      try {
        return service.resolveAction({
          matchId: request.params.id,
          action,
          locationId,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível resolver a ação.'
        return reply.code(message === 'Partida não encontrada.' ? 404 : 400).send({ message })
      }
    },
  )

  app.put<{ Params: MatchParams; Body: PrepareCardBody }>(
    '/api/matches/:id/prepared-card',
    async (request, reply) => {
      const { cardInstanceId } = request.body
      if (
        cardInstanceId !== null &&
        cardInstanceId !== undefined &&
        typeof cardInstanceId !== 'string'
      ) {
        return reply.code(400).send({ message: 'Carta preparada inválida.' })
      }
      try {
        return service.prepareCard(request.params.id, cardInstanceId ?? null)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Não foi possível preparar a carta.'
        return reply.code(message === 'Partida não encontrada.' ? 404 : 400).send({ message })
      }
    },
  )

  app.post<{ Params: MatchParams }>('/api/matches/:id/end-turn', async (request, reply) => {
    try {
      return service.endTurn(request.params.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível encerrar o turno.'
      return reply.code(message === 'Partida não encontrada.' ? 404 : 400).send({ message })
    }
  })

  return app
}
