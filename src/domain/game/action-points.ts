export type SpecialtyPoint = 'technical' | 'social' | 'research' | null
export type InvestigationAction = 'move' | 'examine' | 'converse' | 'analyse' | 'research' | 'card'

export interface ActionPointPool {
  readonly general: number
  readonly specialty: number
  readonly specialtyPoint: SpecialtyPoint
}

export interface ActionCost {
  readonly amount: number
  readonly action: InvestigationAction
}

export function canPayAction(pool: ActionPointPool, cost: ActionCost): boolean {
  if (cost.amount < 0) return false
  return availablePoints(pool, cost.action) >= cost.amount
}

export function spendActionPoints(pool: ActionPointPool, cost: ActionCost): ActionPointPool {
  if (!canPayAction(pool, cost)) throw new Error('Pontos de ação insuficientes.')

  const specialtySpent = isSpecialtyEligible(pool.specialtyPoint, cost.action)
    ? Math.min(pool.specialty, cost.amount)
    : 0

  return {
    general: pool.general - (cost.amount - specialtySpent),
    specialty: pool.specialty - specialtySpent,
    specialtyPoint: pool.specialtyPoint,
  }
}

function availablePoints(pool: ActionPointPool, action: InvestigationAction) {
  return pool.general + (isSpecialtyEligible(pool.specialtyPoint, action) ? pool.specialty : 0)
}

function isSpecialtyEligible(specialty: SpecialtyPoint, action: InvestigationAction) {
  return (
    (specialty === 'technical' && action === 'analyse') ||
    (specialty === 'social' && action === 'converse') ||
    (specialty === 'research' && action === 'research')
  )
}
