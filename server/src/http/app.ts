import Fastify from 'fastify'
import { InMemoryMatchRepository } from '../infrastructure/persistence/in-memory-match-repository.js'
import {
  isInvestigationAction,
  isInvestigatorId,
  isLocationId,
  MatchService,
} from '../application/match-service.js'
import { isPersonId } from '../content/case01-conversations.js'
import { MatchPresenter } from './presenters/match-presenter.js'

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

interface ConversationParams extends MatchParams {
  personId: string
}

interface ConversationQuery {
  locationId?: unknown
}

interface ConversationQuestionParams extends ConversationParams {
  questionId: string
}

interface ResolveConversationBody {
  locationId?: unknown
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
      return reply.code(201).send(MatchPresenter.toPublicDto(match))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a partida.'
      return reply.code(400).send({ message })
    }
  })

  app.get<{ Params: MatchParams }>('/api/matches/:id', async (request, reply) => {
    const match = service.getMatch(request.params.id)
    if (!match) return reply.code(404).send({ message: 'Partida não encontrada.' })
    return MatchPresenter.toPublicDto(match)
  })

  app.get<{ Params: ConversationParams; Querystring: ConversationQuery }>(
    '/api/matches/:id/conversations/:personId',
    async (request, reply) => {
      const { personId } = request.params
      const { locationId } = request.query
      if (!isPersonId(personId) || !isLocationId(locationId)) {
        return reply.code(400).send({ message: 'Pessoa ou local inválido.' })
      }
      try {
        return service.getConversationOptions(request.params.id, personId, locationId)
      } catch (error) {
        return sendMatchError(reply, error, 'Não foi possível consultar a conversa.')
      }
    },
  )

  app.post<{
    Params: ConversationQuestionParams
    Body: ResolveConversationBody
  }>('/api/matches/:id/conversations/:personId/questions/:questionId', async (request, reply) => {
    const { personId, questionId } = request.params
    const { locationId } = request.body
    if (!isPersonId(personId) || !isLocationId(locationId) || !questionId) {
      return reply.code(400).send({ message: 'Pessoa, pergunta ou local inválido.' })
    }
    try {
      const match = service.resolveConversation({
        matchId: request.params.id,
        personId,
        locationId,
        questionId,
      })
      return MatchPresenter.toPublicDto(match)
    } catch (error) {
      return sendMatchError(reply, error, 'Não foi possível resolver a pergunta.')
    }
  })

  app.post<{ Params: MatchParams; Body: ResolveActionBody }>(
    '/api/matches/:id/actions',
    async (request, reply) => {
      const { action, locationId } = request.body
      if (!isInvestigationAction(action) || !isLocationId(locationId)) {
        return reply.code(400).send({ message: 'Ação ou local inválido.' })
      }

      try {
        const match = service.resolveAction({
          matchId: request.params.id,
          action,
          locationId,
        })
        return MatchPresenter.toPublicDto(match)
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
        const match = service.prepareCard(request.params.id, cardInstanceId ?? null)
        return MatchPresenter.toPublicDto(match)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Não foi possível preparar a carta.'
        return reply.code(message === 'Partida não encontrada.' ? 404 : 400).send({ message })
      }
    },
  )

  app.post<{ Params: MatchParams }>('/api/matches/:id/end-turn', async (request, reply) => {
    try {
      const match = service.endTurn(request.params.id)
      return MatchPresenter.toPublicDto(match)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível encerrar o turno.'
      return reply.code(message === 'Partida não encontrada.' ? 404 : 400).send({ message })
    }
  })

  return app
}

function sendMatchError(
  reply: { code(statusCode: number): { send(payload: { message: string }): unknown } },
  error: unknown,
  fallback: string,
) {
  const message = error instanceof Error ? error.message : fallback
  return reply.code(message === 'Partida não encontrada.' ? 404 : 400).send({ message })
}
