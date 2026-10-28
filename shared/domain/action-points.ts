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

export interface EffectiveActionCostInput {
  readonly baseCost: number
  readonly preparedCardCost?: number
  readonly surcharge?: number
  readonly discount?: number
  readonly minimumCost?: number
}

export interface InvestigatorActionCostInput {
  readonly investigatorId: InvestigatorId
  readonly action: InvestigationAction
  readonly locationId: LocationId
  readonly examinedLocationsThisRound: readonly LocationId[]
  readonly preparedCardCost: number
  readonly preparedCardId?: string
  readonly hasMarkedClueForFollowUp?: boolean
}

export function investigatorActionCost(input: InvestigatorActionCostInput): number {
  const firstExamineInLocation =
    input.investigatorId === 'livia' &&
    input.action === 'examine' &&
    !input.examinedLocationsThisRound.includes(input.locationId)
  const markerDiscount =
    input.action === 'analyse' &&
    input.hasMarkedClueForFollowUp &&
    input.preparedCardId !== 'trace-marker'
      ? 1
      : 0

  return calculateEffectiveActionCost({
    baseCost: firstExamineInLocation ? 1 : 2,
    preparedCardCost: input.preparedCardCost,
    discount: markerDiscount,
  })
}

export function calculateEffectiveActionCost(input: EffectiveActionCostInput): number {
  const baseCost = Math.max(0, input.baseCost)
  const preparedCardCost = Math.max(0, input.preparedCardCost ?? 0)
  const surcharge = Math.max(0, input.surcharge ?? 0)
  const discount = Math.max(0, input.discount ?? 0)
  const minimumCost = input.minimumCost ?? (baseCost === 0 ? 0 : 1)

  return Math.max(minimumCost, baseCost + preparedCardCost + surcharge - discount)
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
