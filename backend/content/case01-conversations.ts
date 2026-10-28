import { personIds, type PersonId } from '../../shared/domain/identifiers.js'
import type { ContestableStatementCrossing, LocationId } from '../domain/match.js'
import type { CaseConversationDefinition } from './case-content-definition.js'
import { case01Content } from './cases/case01/v1.js'

export { personIds }
export type ConversationApproach = 'inquiry' | 'pressure' | 'context'
export type ConversationOutcomeStatus = 'recorded' | 'contestable' | 'blocked'
export type ConversationReward = 'curator-agenda' | 'treatment-sheet' | 'guest-list' | 'patrol-map'

export interface ConversationQuestion {
  readonly id: string
  readonly text: string
  readonly cost: 1 | 2
  readonly approach: ConversationApproach
  readonly result: string
}

export function isPersonId(value: unknown): value is PersonId {
  return typeof value === 'string' && personIds.some((personId) => personId === value)
}

export function getConversation(personId: PersonId): CaseConversationDefinition {
  const conversation = case01Content.conversations.find((item) => item.personId === personId)
  if (!conversation) throw new Error(`Conversa não encontrada para ${personId}.`)
  return conversation
}

export function isPersonAvailableAtLocation(personId: PersonId, locationId: LocationId): boolean {
  return getConversation(personId).locationId === locationId
}

export function getConversationBlockReason(
  personId: PersonId,
  questionId: string,
  context: { readonly resolvedKeys: readonly string[] },
): string | undefined {
  const question = getConversation(personId).questions.find((item) => item.id === questionId)
  const block = question?.blockedWhen
  return block && block.requiresResolvedKeys.some((key) => !context.resolvedKeys.includes(key))
    ? block.reason
    : undefined
}

export function resolveConversationOutcome(
  personId: PersonId,
  questionId: string,
  context: { readonly resolvedKeys: readonly string[] },
):
  | {
      readonly content: string
      readonly status: ConversationOutcomeStatus
      readonly contestableCrossing?: ContestableStatementCrossing
    }
  | undefined {
  const question = case01Content.conversations
    .find((item) => item.personId === personId)
    ?.questions.find((item) => item.id === questionId)
  if (!question) return undefined
  const matchingOutcome = question.outcomes?.find((outcome) =>
    outcome.whenResolvedKeys?.every((key) => context.resolvedKeys.includes(key)),
  )
  const fallbackOutcome = question.outcomes?.find((outcome) => !outcome.whenResolvedKeys)
  const outcome = matchingOutcome ?? fallbackOutcome
  return outcome
    ? {
        content: outcome.content,
        status: outcome.status,
        ...(outcome.contestableCrossing
          ? { contestableCrossing: outcome.contestableCrossing }
          : {}),
      }
    : { content: question.result, status: 'recorded' }
}

export function getConversationReward(
  personId: PersonId,
  questionId: string,
): ConversationReward | undefined {
  return case01Content.conversations
    .find((item) => item.personId === personId)
    ?.questions.find((question) => question.id === questionId)?.reward
}
