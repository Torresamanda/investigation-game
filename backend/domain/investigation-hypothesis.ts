export const evidenceAxes = ['means', 'opportunity', 'link'] as const

export type EvidenceAxis = (typeof evidenceAxes)[number]

export type HypothesisStatus = 'inquiry' | 'plausible' | 'sustained' | 'contested' | 'discarded'

export interface HypothesisEvidence {
  readonly entryId: string
  readonly axis: EvidenceAxis
}

export interface HypothesisRelation {
  readonly id: string
  readonly fromEntryId: string
  readonly toEntryId: string
}

export interface InvestigationHypothesis {
  readonly id: string
  readonly status: HypothesisStatus
  readonly evidence: readonly HypothesisEvidence[]
  readonly coherentRelationIds: readonly string[]
  readonly hasOperationalInconsistency: boolean
}

interface HypothesisEvidenceSource {
  readonly id: string
  readonly evidenceAxes?: readonly EvidenceAxis[]
  readonly hypothesisThreadIds?: readonly string[]
}

interface HypothesisRelationSource {
  readonly id: string
  readonly hypothesisThreadId?: string
  readonly fromClueId: string
  readonly toClueId: string
}

export function evaluateHypothesisStatus(
  hypothesis: Pick<
    InvestigationHypothesis,
    'evidence' | 'coherentRelationIds' | 'hasOperationalInconsistency'
  >,
): HypothesisStatus {
  if (hypothesis.hasOperationalInconsistency) return 'contested'

  const coveredAxes = new Set(hypothesis.evidence.map((evidence) => evidence.axis))
  if (coveredAxes.size === evidenceAxes.length && hypothesis.coherentRelationIds.length >= 2) {
    return 'sustained'
  }
  if (coveredAxes.size >= 2 && hypothesis.coherentRelationIds.length >= 1) return 'plausible'
  return 'inquiry'
}

export function createInvestigationHypothesis(
  id: string,
  evidence: readonly HypothesisEvidence[],
  relations: readonly HypothesisRelation[],
  hasOperationalInconsistency = false,
): InvestigationHypothesis {
  return {
    id,
    status: evaluateHypothesisStatus({
      evidence,
      coherentRelationIds: relations.map((relation) => relation.id),
      hasOperationalInconsistency,
    }),
    evidence,
    coherentRelationIds: relations.map((relation) => relation.id),
    hasOperationalInconsistency,
  }
}

export function synchronizeInvestigationHypotheses(
  evidenceSources: readonly HypothesisEvidenceSource[],
  relationSources: readonly HypothesisRelationSource[],
  existingHypotheses: readonly InvestigationHypothesis[],
): readonly InvestigationHypothesis[] {
  const threadIds = new Set(evidenceSources.flatMap((source) => source.hypothesisThreadIds ?? []))
  return [...threadIds].map((threadId) => {
    const evidence = evidenceSources.flatMap((source) =>
      source.hypothesisThreadIds?.includes(threadId)
        ? (source.evidenceAxes ?? []).map((axis) => ({ entryId: source.id, axis }))
        : [],
    )
    const relations = relationSources
      .filter(
        (relation) =>
          relation.hypothesisThreadId === threadId &&
          isCoherentRelationForThread(relation, evidenceSources, threadId),
      )
      .map((relation) => ({
        id: relation.id,
        fromEntryId: relation.fromClueId,
        toEntryId: relation.toClueId,
      }))
    const previous = existingHypotheses.find((hypothesis) => hypothesis.id === threadId)
    return createInvestigationHypothesis(
      threadId,
      evidence,
      relations,
      previous?.hasOperationalInconsistency ?? false,
    )
  })
}

function isCoherentRelationForThread(
  relation: HypothesisRelationSource,
  evidenceSources: readonly HypothesisEvidenceSource[],
  threadId: string,
): boolean {
  if (relation.fromClueId === relation.toClueId) return false

  const fromEvidence = evidenceSources.find((source) => source.id === relation.fromClueId)
  const toEvidence = evidenceSources.find((source) => source.id === relation.toClueId)
  if (
    !fromEvidence?.hypothesisThreadIds?.includes(threadId) ||
    !toEvidence?.hypothesisThreadIds?.includes(threadId)
  ) {
    return false
  }

  return (
    fromEvidence.evidenceAxes?.some((axis) => !toEvidence.evidenceAxes?.includes(axis)) ?? false
  )
}
