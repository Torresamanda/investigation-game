export const investigatorIds = ['livia', 'rafael', 'isadora', 'otavio'] as const

export type InvestigatorId = (typeof investigatorIds)[number]

export const locationIds = [
  'gallery',
  'security',
  'laboratory',
  'office',
  'service-corridor',
] as const

export type LocationId = (typeof locationIds)[number]

export const personIds = ['helena', 'raul', 'marta', 'davi'] as const

export type PersonId = (typeof personIds)[number]

export const investigationActions = [
  'move',
  'examine',
  'converse',
  'analyse',
  'research',
  'card',
] as const

export type InvestigationAction = (typeof investigationActions)[number]
