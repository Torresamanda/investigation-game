import { describe, expect, it } from 'vitest'
import { readServerConfig } from './server-config.js'

describe('readServerConfig', () => {
  it('usa valores locais seguros durante o desenvolvimento', () => {
    expect(readServerConfig({})).toEqual({
      port: 3333,
      databasePath: 'data/investigation.sqlite',
      allowedOrigin: 'http://127.0.0.1:5173',
    })
  })

  it('exige a origem e o caminho do banco em produção', () => {
    expect(() => readServerConfig({ NODE_ENV: 'production' })).toThrow(
      'DATABASE_PATH precisa ser definida em produção.',
    )
    expect(() =>
      readServerConfig({ NODE_ENV: 'production', DATABASE_PATH: '/data/game.sqlite' }),
    ).toThrow('ALLOWED_ORIGIN precisa ser definida em produção.')
  })

  it('rejeita porta e origem inválidas', () => {
    expect(() => readServerConfig({ PORT: 'invalid' })).toThrow(
      'PORT precisa ser um número inteiro',
    )
    expect(() => readServerConfig({ ALLOWED_ORIGIN: 'not-an-origin' })).toThrow(
      'ALLOWED_ORIGIN precisa conter uma origem HTTP(S) válida.',
    )
    expect(() => readServerConfig({ ALLOWED_ORIGIN: 'ftp://files.example' })).toThrow(
      'ALLOWED_ORIGIN precisa conter uma origem HTTP(S) válida.',
    )
  })
})
