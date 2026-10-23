import { MatchService, isInvestigatorId } from '../../../server/src/application/match-service.js'
import { MatchPresenter } from '../../../server/src/http/presenters/match-presenter.js'
import { InMemoryMatchRepository } from '../../../server/src/infrastructure/persistence/in-memory-match-repository.js'
import { D1MatchStore, type D1DatabaseConnection } from '../infrastructure/d1-match-store.js'
import { jsonResponse } from './worker-http.js'

export async function handleMatchRequest(request: Request, database: D1DatabaseConnection) {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname === '/api/matches')
    return createMatch(request, database)
  const matchId = url.pathname.match(/^\/api\/matches\/([^/]+)$/)?.[1]
  if (request.method === 'GET' && matchId) return getMatch(matchId, database)
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
