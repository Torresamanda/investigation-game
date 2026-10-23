import type { InvestigationAction, InvestigatorId, LocationId } from './identifiers'

export type SpecialtyPoint = 'technical' | 'social' | 'research' | null

export interface ActionPointPool {
  readonly general: number
  readonly specialty: number
  readonly specialtyPoint: SpecialtyPoint
}

export interface ActionCost {
  readonly amount: number
  readonly action: InvestigationAction
  readonly specialtyEligible?: boolean
}

export interface InvestigatorActionCostInput {
  readonly investigatorId: InvestigatorId
  readonly action: InvestigationAction
  readonly locationId: LocationId
  readonly examinedLocationsThisRound: readonly LocationId[]
  readonly preparedCardCost: number
  readonly preparedCardId?: string
  readonly canCreateConnection: boolean
}

export function investigatorActionCost(input: InvestigatorActionCostInput): number {
  const firstExamineInLocation =
    input.investigatorId === 'livia' &&
    input.action === 'examine' &&
    !input.examinedLocationsThisRound.includes(input.locationId)
  const connectionCost =
    input.investigatorId === 'otavio' && input.action === 'research' && input.canCreateConnection
      ? 1
      : 0

  const markerDiscount =
    input.action === 'analyse' && input.preparedCardId === 'trace-marker' ? 1 : 0

  return Math.max(
    1,
    (firstExamineInLocation ? 1 : 2) + input.preparedCardCost + connectionCost - markerDiscount,
  )
}

export function canPayAction(pool: ActionPointPool, cost: ActionCost): boolean {
  if (cost.amount < 0) return false
  return availablePoints(pool, cost.action, cost.specialtyEligible) >= cost.amount
}

export function spendActionPoints(pool: ActionPointPool, cost: ActionCost): ActionPointPool {
  if (!canPayAction(pool, cost)) throw new Error('Pontos de ação insuficientes.')

  const specialtySpent =
    isSpecialtyEligible(pool.specialtyPoint, cost.action) || cost.specialtyEligible
      ? Math.min(pool.specialty, cost.amount)
      : 0

  return {
    general: pool.general - (cost.amount - specialtySpent),
    specialty: pool.specialty - specialtySpent,
    specialtyPoint: pool.specialtyPoint,
  }
}

export function addSpecialtyPoints(
  pool: ActionPointPool,
  specialtyPoint: Exclude<SpecialtyPoint, null>,
  amount: number,
): ActionPointPool {
  if (pool.specialtyPoint !== specialtyPoint || amount <= 0) return pool
  return { ...pool, specialty: pool.specialty + amount }
}

function availablePoints(
  pool: ActionPointPool,
  action: InvestigationAction,
  specialtyEligible = false,
): number {
  return (
    pool.general +
    (isSpecialtyEligible(pool.specialtyPoint, action) || specialtyEligible ? pool.specialty : 0)
  )
}

function isSpecialtyEligible(specialty: SpecialtyPoint, action: InvestigationAction): boolean {
  return (
    (specialty === 'technical' && action === 'analyse') ||
    (specialty === 'social' && action === 'converse') ||
    (specialty === 'research' && action === 'research')
  )
}
