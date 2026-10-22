import { createApp } from './http/app.js'
import { MatchService } from './application/match-service.js'
import { SqliteMatchRepository } from './infrastructure/sqlite-match-repository.js'

const app = createApp(new MatchService(new SqliteMatchRepository('data/investigation.sqlite')))
const port = Number(process.env.PORT ?? 3333)

await app.listen({ host: '127.0.0.1', port })
