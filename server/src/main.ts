import { createApp } from './http/app.js'
import { MatchService } from './application/match-service.js'
import { SqliteMatchRepository } from './infrastructure/sqlite-match-repository.js'
import { NodeCryptoRandomGenerator } from './infrastructure/crypto/node-crypto-random-generator.js'
import { readServerConfig } from './config/server-config.js'
import { randomUUID } from 'node:crypto'

const config = readServerConfig()
const app = createApp(
  new MatchService(
    new SqliteMatchRepository(config.databasePath),
    undefined,
    randomUUID,
    undefined,
    new NodeCryptoRandomGenerator(),
  ),
  { allowedOrigin: config.allowedOrigin },
)

await app.listen({ host: '0.0.0.0', port: config.port })
