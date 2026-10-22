import type {
  CaseContentRepository,
  CaseActionResolution,
} from '../../application/ports/case-content-repository.js'
import {
  getConversation,
  getConversationReward,
  getConversationBlockReason,
  isPersonAvailableAtLocation,
  resolveConversationOutcome,
} from '../../content/case01-conversations.js'
import type {
  InvestigationAction,
  LocationId,
  PersonId,
} from '../../../../shared/domain/identifiers.js'
import type { SoloMatch } from '../../domain/match.js'

export class Case01ContentRepository implements CaseContentRepository {
  getConversation(personId: PersonId) {
    const conversation = getConversation(personId)
    return {
      personName: conversation.personName,
      questions: conversation.questions.map(({ id, text, cost, approach }) => ({
        id,
        text,
        cost,
        approach,
      })),
    }
  }

  isPersonAvailableAtLocation(personId: PersonId, locationId: LocationId): boolean {
    return isPersonAvailableAtLocation(personId, locationId)
  }

  getConversationBlockReason(personId: PersonId, questionId: string, match: SoloMatch) {
    return getConversationBlockReason(personId, questionId, match)
  }

  resolveConversationOutcome(personId: PersonId, questionId: string, match: SoloMatch) {
    return resolveConversationOutcome(personId, questionId, match)
  }

  getConversationReward(personId: PersonId, questionId: string, round: number) {
    return getConversationReward(personId, questionId, round)
  }

  resolveAction(
    match: SoloMatch,
    action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>,
    locationId: LocationId,
  ): CaseActionResolution {
    const entryId = `journal-${match.journalEntries.length + 1}`
    if (match.round === 1 && locationId === 'gallery' && action === 'examine') {
      if (!match.resolvedKeys.includes('gallery-lock')) {
        return {
          resolvedKey: 'gallery-lock',
          entry: {
            id: entryId,
            type: 'clue',
            title: 'Fechadura de emergência',
            content:
              'A fechadura interna não tem dano. A vitrine foi aberta com uma chave de emergência.',
            locationId,
            round: match.round,
            status: 'unconfirmed',
          },
        }
      }
      if (!match.resolvedKeys.includes('gallery-pedestal')) {
        return {
          resolvedKey: 'gallery-pedestal',
          entry: {
            id: entryId,
            type: 'clue',
            title: 'Vestígio no pedestal',
            content:
              'Resíduo escuro de óleo e pó fino segue em direção a uma porta de serviço lacrada.',
            locationId,
            round: match.round,
            status: 'unconfirmed',
          },
        }
      }
    }

    return {
      entry: {
        id: entryId,
        type: 'observation',
        title: 'Nenhuma descoberta nova',
        content:
          'Esta abordagem não revelou informação nova neste contexto. Tente outro local ou uma nova ação.',
        locationId,
        round: match.round,
        status: 'note',
      },
    }
  }
}
