import { MatchService } from '../../../backend/application/match-service.js'
import type { MatchRepository } from '../../../backend/application/ports/match-repository.js'
import { WebCryptoRandomGenerator } from '../../../backend/infrastructure/crypto/web-crypto-random-generator.js'

export function createWorkerMatchService(repository: MatchRepository): MatchService {
  return new MatchService(
    repository,
    undefined,
    () => globalThis.crypto.randomUUID(),
    undefined,
    new WebCryptoRandomGenerator(),
  )
}
