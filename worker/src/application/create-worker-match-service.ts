import { MatchService } from '../../../server/src/application/match-service.js'
import type { MatchRepository } from '../../../server/src/application/ports/match-repository.js'
import { WebCryptoRandomGenerator } from '../../../server/src/infrastructure/crypto/web-crypto-random-generator.js'

export function createWorkerMatchService(repository: MatchRepository): MatchService {
  return new MatchService(
    repository,
    undefined,
    () => globalThis.crypto.randomUUID(),
    undefined,
    new WebCryptoRandomGenerator(),
  )
}
