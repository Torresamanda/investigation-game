import {
  MatchService,
  isInvestigationAction,
  isInvestigatorId,
  isLocationId,
} from '../../../backend/application/match-service.js'
import { DomainError, MatchNotFoundError } from '../../../backend/domain/errors.js'
import type { SoloMatch } from '../../../backend/domain/match.js'
import { isPersonId } from '../../../backend/content/case01-conversations.js'
import { MatchPresenter } from '../../../backend/presenters/match-presenter.js'
import { InMemoryMatchRepository } from '../../../backend/infrastructure/persistence/in-memory-match-repository.js'
import { createWorkerMatchService } from '../application/create-worker-match-service.js'
import { D1MatchSessionStore } from '../infrastructure/d1-match-session-store.js'
import {
  D1MatchStore,
  MatchVersionConflictError,
  type D1DatabaseConnection,
} from '../infrastructure/d1-match-store.js'
import { hasOnlyFields, isOversizedBody, readJsonBody } from './request-body.js'
import { jsonResponse } from './json-response.js'

const matchTokenHeader = 'x-match-token'

export async function handleMatchRequest(request: Request, database: D1DatabaseConnection) {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname === '/api/matches')
    return createMatch(request, database)
  const protectedMatchId = url.pathname.match(/^\/api\/matches\/([^/]+)(?:\/|$)/)?.[1]
  if (protectedMatchId) {
    const authorizationError = await authorizeMatchRequest(request, protectedMatchId, database)
    if (authorizationError) return authorizationError
  }
  const matchId = url.pathname.match(/^\/api\/matches\/([^/]+)$/)?.[1]
  if (request.method === 'GET' && matchId) return getMatch(matchId, database)
  if (request.method === 'DELETE' && matchId) return deleteMatch(matchId, database)
  const actionMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/actions$/)?.[1]
  if (request.method === 'POST' && actionMatch) return resolveAction(request, actionMatch, database)
  const moveMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/move$/)?.[1]
  if (request.method === 'POST' && moveMatch) return moveInvestigator(request, moveMatch, database)
  const endTurnMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/end-turn$/)?.[1]
  if (request.method === 'POST' && endTurnMatch) return endTurn(request, endTurnMatch, database)
  const supportMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/support-card$/)?.[1]
  if (request.method === 'POST' && supportMatch)
    return requestSupportCard(request, supportMatch, database)
  const discardMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/discard-card$/)?.[1]
  if (request.method === 'POST' && discardMatch) return discardCard(request, discardMatch, database)
  const preparedMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/prepared-card$/)?.[1]
  if (request.method === 'PUT' && preparedMatch)
    return prepareCard(request, preparedMatch, database)
  const conversationMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/conversations\/([^/]+)$/)
  if (request.method === 'GET' && conversationMatch)
    return getConversationOptions(url, conversationMatch[1], conversationMatch[2], database)
  const questionMatch = url.pathname.match(
    /^\/api\/matches\/([^/]+)\/conversations\/([^/]+)\/questions\/([^/]+)$/,
  )
  if (request.method === 'POST' && questionMatch)
    return resolveConversation(
      request,
      questionMatch[1],
      questionMatch[2],
      questionMatch[3],
      database,
    )
  const connectionsMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/connections$/)?.[1]
  if (request.method === 'POST' && connectionsMatch)
    return createJournalConnection(request, connectionsMatch, database)
  const operationsMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/operations$/)?.[1]
  if (request.method === 'GET' && operationsMatch)
    return getAvailableOperations(operationsMatch, database)
  if (request.method === 'POST' && operationsMatch)
    return prepareOperation(request, operationsMatch, database)
  if (request.method === 'DELETE' && operationsMatch)
    return cancelOperation(request, operationsMatch, database)
  const resolveOperationMatch = url.pathname.match(
    /^\/api\/matches\/([^/]+)\/operations\/resolve$/,
  )?.[1]
  if (request.method === 'POST' && resolveOperationMatch)
    return resolveOperation(request, resolveOperationMatch, database)
  return jsonResponse({ message: 'Rota não encontrada.' }, 404)
}

async function getAvailableOperations(
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  return readMatch(id, database, (service, matchId) => service.getAvailableOperations(matchId))
}

async function prepareOperation(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  const operationId =
    typeof body === 'object' && body !== null && 'operationId' in body
      ? body.operationId
      : undefined
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (!hasOnlyFields(body, ['operationId']) || !isNonEmptyString(operationId)) {
    return jsonResponse({ message: 'Operação inválida.' }, 400)
  }
  return mutateMatch(id, database, (service, matchId) =>
    service.prepareOperation(matchId, operationId),
  )
}

async function resolveOperation(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (body) return jsonResponse({ message: 'Operação inválida.' }, 400)
  return mutateMatch(id, database, (service, matchId) => service.resolveOperation(matchId))
}

async function cancelOperation(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (body) return jsonResponse({ message: 'Operação inválida.' }, 400)
  return mutateMatch(id, database, (service, matchId) => service.cancelOperation(matchId))
}

async function createMatch(request: Request, database: D1DatabaseConnection): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (!hasOnlyFields(body, ['activeInvestigatorId', 'supportInvestigatorId']))
    return jsonResponse({ message: 'Investigadores inválidos.' }, 400)
  const activeInvestigatorId = body?.activeInvestigatorId
  const supportInvestigatorId = body?.supportInvestigatorId
  if (!isInvestigatorId(activeInvestigatorId) || !isInvestigatorId(supportInvestigatorId)) {
    return jsonResponse({ message: 'Investigadores inválidos.' }, 400)
  }
  try {
    const match = createWorkerMatchService(new InMemoryMatchRepository()).createSoloMatch({
      activeInvestigatorId,
      supportInvestigatorId,
    })
    await new D1MatchStore(database).save(match)
    const token = await new D1MatchSessionStore(database).issue(match.id)
    return jsonResponse(MatchPresenter.toPublicDto(match), 201, { [matchTokenHeader]: token })
  } catch {
    return jsonResponse({ message: 'A investigação está indisponível.' }, 503)
  }
}

async function getMatch(id: string, database: D1DatabaseConnection): Promise<Response> {
  const matchId = decodePathSegment(id)
  if (!matchId) return jsonResponse({ message: 'Partida inválida.' }, 400)
  try {
    const match = await new D1MatchStore(database).findById(matchId)
    return match
      ? jsonResponse(MatchPresenter.toPublicDto(match))
      : jsonResponse({ message: 'Partida não encontrada.' }, 404)
  } catch {
    return jsonResponse({ message: 'A investigação está indisponível.' }, 503)
  }
}

async function deleteMatch(id: string, database: D1DatabaseConnection): Promise<Response> {
  const matchId = decodePathSegment(id)
  if (!matchId) return jsonResponse({ message: 'Partida inválida.' }, 400)
  try {
    const deleted = await new D1MatchStore(database).delete(matchId)
    return deleted
      ? new Response(null, { status: 204 })
      : jsonResponse({ message: 'Partida não encontrada.' }, 404)
  } catch {
    return jsonResponse({ message: 'A investigação está indisponível.' }, 503)
  }
}

async function authorizeMatchRequest(
  request: Request,
  encodedMatchId: string,
  database: D1DatabaseConnection,
): Promise<Response | undefined> {
  const matchId = decodePathSegment(encodedMatchId)
  try {
    const isAuthorized =
      Boolean(matchId) &&
      (await new D1MatchSessionStore(database).authorizes(
        matchId,
        request.headers.get(matchTokenHeader),
      ))
    return isAuthorized
      ? undefined
      : jsonResponse({ message: 'Sessão da partida inválida ou ausente.' }, 401)
  } catch {
    return jsonResponse({ message: 'A investigação está indisponível.' }, 503)
  }
}

async function resolveAction(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (!hasOnlyFields(body, ['action', 'locationId']))
    return jsonResponse({ message: 'Ação ou local inválido.' }, 400)
  const action = body?.action
  const locationId = body?.locationId
  if (!isInvestigationAction(action) || !isLocationId(locationId))
    return jsonResponse({ message: 'Ação ou local inválido.' }, 400)
  return mutateMatch(id, database, (service, matchId) =>
    service.resolveAction({ matchId, action, locationId }),
  )
}

async function moveInvestigator(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (!hasOnlyFields(body, ['locationId'])) return jsonResponse({ message: 'Local inválido.' }, 400)
  const locationId = body?.locationId
  if (!isLocationId(locationId)) return jsonResponse({ message: 'Local inválido.' }, 400)
  return mutateMatch(id, database, (service, matchId) =>
    service.moveInvestigator(matchId, locationId),
  )
}

async function discardCard(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (!hasOnlyFields(body, ['cardInstanceId']))
    return jsonResponse({ message: 'Carta para descarte inválida.' }, 400)
  const cardInstanceId = body?.cardInstanceId
  if (typeof cardInstanceId !== 'string' || !cardInstanceId)
    return jsonResponse({ message: 'Carta para descarte inválida.' }, 400)
  return mutateMatch(id, database, (service, matchId) =>
    service.discardCard(matchId, cardInstanceId),
  )
}

async function prepareCard(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (!hasOnlyFields(body, ['cardInstanceId']))
    return jsonResponse({ message: 'Carta preparada inválida.' }, 400)
  const cardInstanceId = body?.cardInstanceId
  if (cardInstanceId !== null && typeof cardInstanceId !== 'string')
    return jsonResponse({ message: 'Carta preparada inválida.' }, 400)
  return mutateMatch(id, database, (service, matchId) =>
    service.prepareCard(matchId, cardInstanceId),
  )
}

async function endTurn(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (body) return jsonResponse({ message: 'Ação inválida.' }, 400)
  return mutateMatch(id, database, (service, matchId) => service.endTurn(matchId))
}

async function requestSupportCard(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (body) return jsonResponse({ message: 'Ação inválida.' }, 400)
  return mutateMatch(id, database, (service, matchId) => service.requestSupportCard(matchId))
}

async function getConversationOptions(
  url: URL,
  id: string,
  encodedPersonId: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const personId = decodePathSegment(encodedPersonId)
  const locationId = url.searchParams.get('locationId')
  if (
    !hasOnlyQueryParameter(url, 'locationId') ||
    !isPersonId(personId) ||
    !isLocationId(locationId)
  )
    return jsonResponse({ message: 'Pessoa ou local inválido.' }, 400)
  return readMatch(id, database, (service, matchId) =>
    service.getConversationOptions(matchId, personId, locationId),
  )
}

async function resolveConversation(
  request: Request,
  id: string,
  encodedPersonId: string,
  encodedQuestionId: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const personId = decodePathSegment(encodedPersonId)
  const questionId = decodePathSegment(encodedQuestionId)
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (!hasOnlyFields(body, ['locationId']))
    return jsonResponse({ message: 'Pessoa, pergunta ou local inválido.' }, 400)
  const locationId = body.locationId
  if (!isPersonId(personId) || !isLocationId(locationId) || !isNonEmptyString(questionId))
    return jsonResponse({ message: 'Pessoa, pergunta ou local inválido.' }, 400)
  return mutateMatch(id, database, (service, matchId) =>
    service.resolveConversation({ matchId, personId, questionId, locationId }),
  )
}

async function createJournalConnection(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readJsonBody(request)
  if (isOversizedBody(body)) return payloadTooLargeResponse()
  if (!hasOnlyFields(body, ['fromClueId', 'toClueId']))
    return jsonResponse({ message: 'Selecione duas pistas válidas.' }, 400)
  const fromClueId = body?.fromClueId
  const toClueId = body?.toClueId
  if (!isNonEmptyString(fromClueId) || !isNonEmptyString(toClueId))
    return jsonResponse({ message: 'Selecione duas pistas válidas.' }, 400)
  return mutateMatch(id, database, (service, matchId) =>
    service.createJournalConnection({ matchId, fromClueId, toClueId }),
  )
}

async function readMatch<T>(
  id: string,
  database: D1DatabaseConnection,
  read: (service: MatchService, matchId: string) => T,
): Promise<Response> {
  try {
    const matchId = decodePathSegment(id)
    if (!matchId) return jsonResponse({ message: 'Partida inválida.' }, 400)
    const match = await new D1MatchStore(database).findById(matchId)
    if (!match) throw new MatchNotFoundError()
    const repository = new InMemoryMatchRepository()
    repository.save(match)
    return jsonResponse(read(createWorkerMatchService(repository), matchId))
  } catch (error) {
    return matchErrorResponse(error, 'Não foi possível consultar a partida.')
  }
}

async function mutateMatch(
  id: string,
  database: D1DatabaseConnection,
  mutate: (service: MatchService, matchId: string) => SoloMatch,
): Promise<Response> {
  try {
    const matchId = decodePathSegment(id)
    if (!matchId) return jsonResponse({ message: 'Partida inválida.' }, 400)
    const store = new D1MatchStore(database)
    const match = await store.findById(matchId)
    if (!match) throw new MatchNotFoundError()
    const repository = new InMemoryMatchRepository()
    repository.save(match)
    const updated = mutate(createWorkerMatchService(repository), matchId)
    const saved = await store.save(updated)
    if (saved.status !== 'active') await store.delete(saved.id)
    return jsonResponse(MatchPresenter.toPublicDto(saved))
  } catch (error) {
    return matchErrorResponse(error, 'Não foi possível processar a requisição.')
  }
}

function matchErrorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof MatchVersionConflictError)
    return jsonResponse({ message: error.message }, 409)
  if (error instanceof DomainError)
    return jsonResponse({ message: error.message }, error.statusCode)
  return jsonResponse({ message: fallbackMessage }, 500)
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 120
}

function hasOnlyQueryParameter(url: URL, allowedParameter: string): boolean {
  return (
    url.searchParams.getAll(allowedParameter).length === 1 &&
    Array.from(url.searchParams.keys()).every((parameter) => parameter === allowedParameter)
  )
}

function payloadTooLargeResponse(): Response {
  return jsonResponse({ message: 'A requisição excede o tamanho permitido.' }, 413)
}
