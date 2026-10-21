import { createApp } from './http/app.js'

const app = createApp()
const port = Number(process.env.PORT ?? 3333)

await app.listen({ host: '127.0.0.1', port })
