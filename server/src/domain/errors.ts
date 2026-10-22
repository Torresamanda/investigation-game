export class DomainError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'DomainError'
    this.statusCode = statusCode
  }
}

export class MatchNotFoundError extends DomainError {
  constructor() {
    super('Partida não encontrada.', 404)
    this.name = 'MatchNotFoundError'
  }
}

export class InvalidActionError extends DomainError {
  constructor(message: string) {
    super(message, 400)
    this.name = 'InvalidActionError'
  }
}
