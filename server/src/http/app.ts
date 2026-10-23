import Fastify from 'fastify'
import { InMemoryMatchRepository } from '../../../backend/infrastructure/persistence/in-memory-match-repository.js'
import {
  isInvestigationAction,
  isInvestigatorId,
  isLocationId,
  MatchService,
} from '../../../backend/application/match-service.js'
import { isPersonId } from '../../../backend/content/case01-conversations.js'
import { MatchPresenter } from '../../../backend/presenters/match-presenter.js'
import { DomainError, MatchNotFoundError } from '../../../backend/domain/errors.js'
import { locationIds, investigatorIds, personIds } from '../../../shared/domain/identifiers.js'

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

interface MoveBody {
  locationId?: unknown
}

interface CreateJournalConnectionBody {
  fromClueId?: unknown
  toClueId?: unknown
}

interface AccusationBody {
  suspectId?: unknown
  meansClueId?: unknown
  opportunityClueId?: unknown
  linkClueId?: unknown
}

interface PrepareCardBody {
  cardInstanceId?: unknown
}

interface DiscardCardBody {
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

export interface ApiSecurityOptions {
  readonly allowedOrigin?: string
}

const localFrontendOrigin = 'http://127.0.0.1:5173'

export function createApp(
  service = new MatchService(new InMemoryMatchRepository()),
  options: ApiSecurityOptions = {},
) {
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 })
  const allowedOrigin = options.allowedOrigin ?? localFrontendOrigin

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-content-type-options', 'nosniff')
    reply.header('x-frame-options', 'DENY')
    reply.header('referrer-policy', 'no-referrer')

    const origin = request.headers.origin
    if (!origin) return
    if (origin !== allowedOrigin) {
      return reply.code(403).send({ message: 'Origem não autorizada.' })
    }
    reply.header('access-control-allow-origin', allowedOrigin)
    reply.header('access-control-allow-methods', 'GET, POST, PUT, OPTIONS')
    reply.header('access-control-allow-headers', 'content-type')
    reply.header('vary', 'Origin')
  })

  app.options('/*', async (_request, reply) => reply.code(204).send())

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      return reply.code(error.statusCode).send({ message: error.message })
    }
    const statusCode =
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode < 500
        ? error.statusCode
        : 500
    return reply.code(statusCode).send({
      message:
        statusCode === 500
          ? 'Não foi possível processar a requisição.'
          : error instanceof Error
            ? error.message
            : 'Requisição inválida.',
    })
  })

  app.get('/health', async () => ({ status: 'ok' }))

  app.post<{ Body: CreateMatchBody }>(
    '/api/matches',
    {
      schema: {
        body: {
          type: 'object',
          required: ['activeInvestigatorId', 'supportInvestigatorId'],
          additionalProperties: false,
          properties: {
            activeInvestigatorId: { type: 'string', enum: [...investigatorIds] },
            supportInvestigatorId: { type: 'string', enum: [...investigatorIds] },
          },
        },
      },
    },
    async (request, reply) => {
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
    },
  )

  app.get<{ Params: MatchParams }>(
    '/api/matches/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request) => {
      const match = service.getMatch(request.params.id)
      if (!match) throw new MatchNotFoundError()
      return MatchPresenter.toPublicDto(match)
    },
  )

  app.post<{ Params: MatchParams; Body: CreateJournalConnectionBody }>(
    '/api/matches/:id/connections',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
        body: {
          type: 'object',
          required: ['fromClueId', 'toClueId'],
          additionalProperties: false,
          properties: {
            fromClueId: { type: 'string', minLength: 1, maxLength: 120 },
            toClueId: { type: 'string', minLength: 1, maxLength: 120 },
          },
        },
      },
    },
    async (request, reply) => {
      const { fromClueId, toClueId } = request.body
      if (typeof fromClueId !== 'string' || typeof toClueId !== 'string') {
        return reply.code(400).send({ message: 'Selecione duas pistas válidas.' })
      }
      try {
        const match = service.createJournalConnection({
          matchId: request.params.id,
          fromClueId,
          toClueId,
        })
        return MatchPresenter.toPublicDto(match)
      } catch (error) {
        return sendMatchError(reply, error, 'Não foi possível criar a conexão.')
      }
    },
  )

  app.post<{ Params: MatchParams; Body: AccusationBody }>(
    '/api/matches/:id/accuse',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
        body: {
          type: 'object',
          required: ['suspectId', 'meansClueId', 'opportunityClueId', 'linkClueId'],
          additionalProperties: false,
          properties: {
            suspectId: { type: 'string', enum: [...personIds] },
            meansClueId: { type: 'string', minLength: 1, maxLength: 120 },
            opportunityClueId: { type: 'string', minLength: 1, maxLength: 120 },
            linkClueId: { type: 'string', minLength: 1, maxLength: 120 },
          },
        },
      },
    },
    async (request, reply) => {
      const { suspectId, meansClueId, opportunityClueId, linkClueId } = request.body
      if (
        !isPersonId(suspectId) ||
        typeof meansClueId !== 'string' ||
        typeof opportunityClueId !== 'string' ||
        typeof linkClueId !== 'string'
      ) {
        return reply.code(400).send({ message: 'Preencha um dossiê de acusação válido.' })
      }
      try {
        const match = service.accuseSuspect({
          matchId: request.params.id,
          suspectId,
          meansClueId,
          opportunityClueId,
          linkClueId,
        })
        return MatchPresenter.toPublicDto(match)
      } catch (error) {
        return sendMatchError(reply, error, 'Não foi possível apresentar a acusação.')
      }
    },
  )

  app.post<{ Params: MatchParams; Body: MoveBody }>(
    '/api/matches/:id/move',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
        body: {
          type: 'object',
          required: ['locationId'],
          additionalProperties: false,
          properties: { locationId: { type: 'string', enum: [...locationIds] } },
        },
      },
    },
    async (request, reply) => {
      const { locationId } = request.body
      if (!isLocationId(locationId)) return reply.code(400).send({ message: 'Local inválido.' })
      try {
        return MatchPresenter.toPublicDto(service.moveInvestigator(request.params.id, locationId))
      } catch (error) {
        return sendMatchError(reply, error, 'Não foi possível se deslocar.')
      }
    },
  )

  app.get<{ Params: ConversationParams; Querystring: ConversationQuery }>(
    '/api/matches/:id/conversations/:personId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'personId'],
          properties: {
            id: { type: 'string', minLength: 1 },
            personId: { type: 'string', minLength: 1 },
          },
        },
        querystring: {
          type: 'object',
          required: ['locationId'],
          additionalProperties: false,
          properties: { locationId: { type: 'string', enum: [...locationIds] } },
        },
      },
    },
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
  }>(
    '/api/matches/:id/conversations/:personId/questions/:questionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'personId', 'questionId'],
          properties: {
            id: { type: 'string', minLength: 1 },
            personId: { type: 'string', minLength: 1 },
            questionId: { type: 'string', minLength: 1 },
          },
        },
        body: {
          type: 'object',
          required: ['locationId'],
          additionalProperties: false,
          properties: { locationId: { type: 'string', enum: [...locationIds] } },
        },
      },
    },
    async (request, reply) => {
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
    },
  )

  app.post<{ Params: MatchParams; Body: ResolveActionBody }>(
    '/api/matches/:id/actions',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
        body: {
          type: 'object',
          required: ['action', 'locationId'],
          additionalProperties: false,
          properties: {
            action: { type: 'string', enum: ['examine', 'converse', 'analyse', 'research'] },
            locationId: { type: 'string', enum: [...locationIds] },
          },
        },
      },
    },
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
        return sendMatchError(reply, error, 'Não foi possível resolver a ação.')
      }
    },
  )

  app.put<{ Params: MatchParams; Body: PrepareCardBody }>(
    '/api/matches/:id/prepared-card',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: { cardInstanceId: { type: ['string', 'null'] } },
        },
      },
    },
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
        return sendMatchError(reply, error, 'Não foi possível preparar a carta.')
      }
    },
  )

  app.post<{ Params: MatchParams }>(
    '/api/matches/:id/end-turn',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      try {
        const match = service.endTurn(request.params.id)
        return MatchPresenter.toPublicDto(match)
      } catch (error) {
        return sendMatchError(reply, error, 'Não foi possível encerrar o turno.')
      }
    },
  )

  app.post<{ Params: MatchParams }>(
    '/api/matches/:id/support-card',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      try {
        const match = service.requestSupportCard(request.params.id)
        return MatchPresenter.toPublicDto(match)
      } catch (error) {
        return sendMatchError(reply, error, 'Não foi possível acionar o apoio.')
      }
    },
  )

  app.post<{ Params: MatchParams; Body: DiscardCardBody }>(
    '/api/matches/:id/discard-card',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
        body: {
          type: 'object',
          required: ['cardInstanceId'],
          additionalProperties: false,
          properties: { cardInstanceId: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { cardInstanceId } = request.body
      if (typeof cardInstanceId !== 'string' || !cardInstanceId) {
        return reply.code(400).send({ message: 'Carta para descarte inválida.' })
      }
      try {
        const match = service.discardCard(request.params.id, cardInstanceId)
        return MatchPresenter.toPublicDto(match)
      } catch (error) {
        return sendMatchError(reply, error, 'Não foi possível descartar a carta.')
      }
    },
  )

  return app
}

function sendMatchError(
  reply: { code(statusCode: number): { send(payload: { message: string }): unknown } },
  error: unknown,
  fallback: string,
) {
  if (error instanceof DomainError)
    return reply.code(error.statusCode).send({ message: error.message })
  return reply.code(400).send({ message: fallback })
}
