import {
  MatchService,
  isInvestigationAction,
  isInvestigatorId,
  isLocationId,
} from '../../../server/src/application/match-service.js'
import { DomainError, MatchNotFoundError } from '../../../server/src/domain/errors.js'
import type { SoloMatch } from '../../../server/src/domain/match.js'
import { isPersonId } from '../../../server/src/content/case01-conversations.js'
import { MatchPresenter } from '../../../server/src/http/presenters/match-presenter.js'
import { InMemoryMatchRepository } from '../../../server/src/infrastructure/persistence/in-memory-match-repository.js'
import {
  D1MatchStore,
  MatchVersionConflictError,
  type D1DatabaseConnection,
} from '../infrastructure/d1-match-store.js'
import { jsonResponse } from './worker-http.js'

export async function handleMatchRequest(request: Request, database: D1DatabaseConnection) {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname === '/api/matches')
    return createMatch(request, database)
  const matchId = url.pathname.match(/^\/api\/matches\/([^/]+)$/)?.[1]
  if (request.method === 'GET' && matchId) return getMatch(matchId, database)
  const actionMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/actions$/)?.[1]
  if (request.method === 'POST' && actionMatch) return resolveAction(request, actionMatch, database)
  const moveMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/move$/)?.[1]
  if (request.method === 'POST' && moveMatch) return moveInvestigator(request, moveMatch, database)
  const endTurnMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/end-turn$/)?.[1]
  if (request.method === 'POST' && endTurnMatch)
    return mutateMatch(endTurnMatch, database, (service, id) => service.endTurn(id))
  const supportMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/support-card$/)?.[1]
  if (request.method === 'POST' && supportMatch)
    return mutateMatch(supportMatch, database, (service, id) => service.requestSupportCard(id))
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
  const accusationMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/accuse$/)?.[1]
  if (request.method === 'POST' && accusationMatch)
    return accuseSuspect(request, accusationMatch, database)
  return jsonResponse({ message: 'Rota não encontrada.' }, 404)
}

async function createMatch(request: Request, database: D1DatabaseConnection): Promise<Response> {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object')
      return jsonResponse({ message: 'Investigadores inválidos.' }, 400)
    const { activeInvestigatorId, supportInvestigatorId } = body as Record<string, unknown>
    if (!isInvestigatorId(activeInvestigatorId) || !isInvestigatorId(supportInvestigatorId)) {
      return jsonResponse({ message: 'Investigadores inválidos.' }, 400)
    }
    const match = new MatchService(new InMemoryMatchRepository()).createSoloMatch({
      activeInvestigatorId,
      supportInvestigatorId,
    })
    await new D1MatchStore(database).save(match)
    return jsonResponse(MatchPresenter.toPublicDto(match), 201)
  } catch {
    return jsonResponse({ message: 'Investigadores inválidos.' }, 400)
  }
}

async function getMatch(id: string, database: D1DatabaseConnection): Promise<Response> {
  const match = await new D1MatchStore(database).findById(decodeURIComponent(id))
  return match
    ? jsonResponse(MatchPresenter.toPublicDto(match))
    : jsonResponse({ message: 'Partida não encontrada.' }, 404)
}

async function resolveAction(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readBody(request)
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
  const body = await readBody(request)
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
  const body = await readBody(request)
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
  const body = await readBody(request)
  const cardInstanceId = body?.cardInstanceId
  if (cardInstanceId !== null && typeof cardInstanceId !== 'string')
    return jsonResponse({ message: 'Carta preparada inválida.' }, 400)
  return mutateMatch(id, database, (service, matchId) =>
    service.prepareCard(matchId, cardInstanceId),
  )
}

async function getConversationOptions(
  url: URL,
  id: string,
  encodedPersonId: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const personId = decodePathSegment(encodedPersonId)
  const locationId = url.searchParams.get('locationId')
  if (!isPersonId(personId) || !isLocationId(locationId))
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
  const locationId = (await readBody(request))?.locationId
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
  const body = await readBody(request)
  const fromClueId = body?.fromClueId
  const toClueId = body?.toClueId
  if (!isNonEmptyString(fromClueId) || !isNonEmptyString(toClueId))
    return jsonResponse({ message: 'Selecione duas pistas válidas.' }, 400)
  return mutateMatch(id, database, (service, matchId) =>
    service.createJournalConnection({ matchId, fromClueId, toClueId }),
  )
}

async function accuseSuspect(
  request: Request,
  id: string,
  database: D1DatabaseConnection,
): Promise<Response> {
  const body = await readBody(request)
  const suspectId = body?.suspectId
  const meansClueId = body?.meansClueId
  const opportunityClueId = body?.opportunityClueId
  const linkClueId = body?.linkClueId
  if (
    !isPersonId(suspectId) ||
    !isNonEmptyString(meansClueId) ||
    !isNonEmptyString(opportunityClueId) ||
    !isNonEmptyString(linkClueId)
  ) {
    return jsonResponse({ message: 'Preencha um dossiê de acusação válido.' }, 400)
  }
  return mutateMatch(id, database, (service, matchId) =>
    service.accuseSuspect({
      matchId,
      suspectId,
      meansClueId,
      opportunityClueId,
      linkClueId,
    }),
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
    return jsonResponse(read(new MatchService(repository), matchId))
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
    const updated = mutate(new MatchService(repository), matchId)
    const saved = await store.save(updated)
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

async function readBody(request: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}
