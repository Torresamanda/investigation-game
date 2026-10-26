export const evidenceAxes = ['means', 'opportunity', 'link'] as const

export type EvidenceAxis = (typeof evidenceAxes)[number]

export type HypothesisStatus = 'inquiry' | 'plausible' | 'sustained' | 'contested' | 'discarded'

export interface HypothesisEvidence {
  readonly entryId: string
  readonly axis: EvidenceAxis
}

export interface HypothesisConnection {
  readonly id: string
  readonly fromEntryId: string
  readonly toEntryId: string
}

export interface InvestigationHypothesis {
  readonly id: string
  readonly status: HypothesisStatus
  readonly evidence: readonly HypothesisEvidence[]
  readonly connectionIds: readonly string[]
  readonly hasOperationalInconsistency: boolean
}

interface HypothesisEvidenceSource {
  readonly id: string
  readonly evidenceAxes?: readonly EvidenceAxis[]
  readonly hypothesisThreadIds?: readonly string[]
}

interface HypothesisConnectionSource {
  readonly id: string
  readonly hypothesisThreadId?: string
}

export function evaluateHypothesisStatus(
  hypothesis: Pick<
    InvestigationHypothesis,
    'evidence' | 'connectionIds' | 'hasOperationalInconsistency'
  >,
): HypothesisStatus {
  if (hypothesis.hasOperationalInconsistency) return 'contested'

  const coveredAxes = new Set(hypothesis.evidence.map((evidence) => evidence.axis))
  if (coveredAxes.size === evidenceAxes.length && hypothesis.connectionIds.length >= 2) {
    return 'sustained'
  }
  if (coveredAxes.size >= 2 && hypothesis.connectionIds.length >= 1) return 'plausible'
  return 'inquiry'
}

export function createInvestigationHypothesis(
  id: string,
  evidence: readonly HypothesisEvidence[],
  connections: readonly HypothesisConnection[],
  hasOperationalInconsistency = false,
): InvestigationHypothesis {
  return {
    id,
    status: evaluateHypothesisStatus({
      evidence,
      connectionIds: connections.map((connection) => connection.id),
      hasOperationalInconsistency,
    }),
    evidence,
    connectionIds: connections.map((connection) => connection.id),
    hasOperationalInconsistency,
  }
}

export function synchronizeInvestigationHypotheses(
  evidenceSources: readonly HypothesisEvidenceSource[],
  connectionSources: readonly HypothesisConnectionSource[],
  existingHypotheses: readonly InvestigationHypothesis[],
): readonly InvestigationHypothesis[] {
  const threadIds = new Set(evidenceSources.flatMap((source) => source.hypothesisThreadIds ?? []))
  return [...threadIds].map((threadId) => {
    const evidence = evidenceSources.flatMap((source) =>
      source.hypothesisThreadIds?.includes(threadId)
        ? (source.evidenceAxes ?? []).map((axis) => ({ entryId: source.id, axis }))
        : [],
    )
    const connections = connectionSources
      .filter((connection) => connection.hypothesisThreadId === threadId)
      .map((connection) => ({
        id: connection.id,
        fromEntryId: '',
        toEntryId: '',
      }))
    const previous = existingHypotheses.find((hypothesis) => hypothesis.id === threadId)
    return createInvestigationHypothesis(
      threadId,
      evidence,
      connections,
      previous?.hasOperationalInconsistency ?? false,
    )
  })
}
