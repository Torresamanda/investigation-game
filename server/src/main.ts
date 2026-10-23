import { createApp } from './http/app.js'
import { MatchService } from './application/match-service.js'
import { SqliteMatchRepository } from './infrastructure/sqlite-match-repository.js'
import { readServerConfig } from './config/server-config.js'

const config = readServerConfig()
const app = createApp(new MatchService(new SqliteMatchRepository(config.databasePath)), {
  allowedOrigin: config.allowedOrigin,
})

await app.listen({ host: '0.0.0.0', port: config.port })
