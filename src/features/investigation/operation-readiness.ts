import type { MatchHypothesisProgress } from '../../../shared/contracts/match'
import type { OperationOption } from '../../services/game-api'

type HypothesisStatus = MatchHypothesisProgress['status']

const statusLabels: Record<HypothesisStatus, string> = {
  inquiry: 'Em apuração',
  plausible: 'Plausível',
  sustained: 'Sustentada',
  contested: 'Contestada',
  discarded: 'Descartada',
}

export interface OperationReadinessGuidance {
  readonly title: string
  readonly message: string
  readonly kind: 'progress' | 'available'
}

export function hypothesisStatusLabel(status: HypothesisStatus): string {
  return statusLabels[status]
}

export function getOperationReadinessGuidance(
  operations: readonly OperationOption[],
  hypotheses: readonly MatchHypothesisProgress[],
): readonly OperationReadinessGuidance[] {
  const guidance: OperationReadinessGuidance[] = []

  if (operations.some((operation) => operation.kind === 'verify')) {
    guidance.push({
      title: 'Verificação disponível',
      message:
        'Uma linha plausível já pode ser verificada. A operação testa se as evidências organizadas resistem a uma nova análise.',
      kind: 'available',
    })
  }

  if (operations.some((operation) => operation.kind === 'closure')) {
    guidance.push({
      title: 'Encerramento disponível',
      message:
        'Uma linha sustentada permite decidir se a equipe está pronta para uma operação de encerramento.',
      kind: 'available',
    })
  }

  if (guidance.length) return guidance

  if (hypotheses.some((hypothesis) => hypothesis.status === 'sustained')) {
    return [
      {
        title: 'Linha sustentada',
        message:
          'As evidências formam uma linha consistente. Consulte as opções de operação disponíveis para decidir como avançar.',
        kind: 'progress',
      },
    ]
  }

  if (hypotheses.some((hypothesis) => hypothesis.status === 'plausible')) {
    return [
      {
        title: 'Linha plausível',
        message:
          'A linha já tem forma. Continue conferindo as evidências e relações para que ela possa sustentar uma decisão.',
        kind: 'progress',
      },
    ]
  }

  if (hypotheses.some((hypothesis) => hypothesis.status === 'contested')) {
    return [
      {
        title: 'Linha contestada',
        message:
          'Uma linha foi contestada. Reavalie as evidências e relações já registradas para recuperar consistência.',
        kind: 'progress',
      },
    ]
  }

  if (hypotheses.some((hypothesis) => hypothesis.status === 'discarded')) {
    return [
      {
        title: 'Linha descartada',
        message:
          'Essa linha não avançará. Reavalie os registros para desenvolver outra explicação possível.',
        kind: 'progress',
      },
    ]
  }

  return [
    {
      title: 'Em apuração',
      message:
        'Registre evidências e estabeleça relações coerentes para desenvolver uma linha de raciocínio que possa ser verificada.',
      kind: 'progress',
    },
  ]
}
