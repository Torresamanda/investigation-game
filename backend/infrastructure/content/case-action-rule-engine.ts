import type {
  CaseActionRuleDefinition,
  CaseContentDefinitionV1,
} from '../../content/case-content-definition.js'
import type { InvestigationAction, LocationId } from '../../../shared/domain/identifiers.js'
import type { SoloMatch } from '../../domain/match.js'
import type { CaseActionResolution } from '../../application/ports/case-content-repository.js'

type CaseAction = Exclude<InvestigationAction, 'move' | 'card' | 'converse'>

export function resolveConfiguredAction(
  definition: CaseContentDefinitionV1,
  match: SoloMatch,
  action: CaseAction,
  locationId: LocationId,
  preparedCardId: string | undefined,
): CaseActionResolution {
  const rule = definition.actionRules.find((candidate) =>
    matchesRule(candidate, match, action, locationId, preparedCardId),
  )
  const entryId = `journal-${match.journalEntries.length + 1}`
  if (!rule) return { entry: createObservation(match, action, locationId, entryId) }

  const evidence = definition.evidence.find((item) => item.key === rule.evidenceKey)
  if (!evidence) throw new Error(`Evidência não encontrada: ${rule.evidenceKey}.`)
  return {
    resolvedKey: evidence.key,
    entry: {
      id: entryId,
      type: 'clue',
      title: evidence.title,
      content: evidence.content,
      locationId: evidence.locationId,
      round: match.round,
      status: evidence.status,
      ...(evidence.confirmedEvidenceKey && evidence.status === 'confirmed'
        ? { caseEvidenceKey: evidence.confirmedEvidenceKey }
        : {}),
    },
    ...(evidence.unlocksLocationId ? { unlockedLocationIds: [evidence.unlocksLocationId] } : {}),
  }
}

function matchesRule(
  rule: CaseActionRuleDefinition,
  match: SoloMatch,
  action: CaseAction,
  locationId: LocationId,
  preparedCardId: string | undefined,
): boolean {
  if (rule.action !== action || rule.locationId !== locationId) return false
  if (rule.minimumRound && match.round < rule.minimumRound) return false
  if (match.resolvedKeys.includes(rule.evidenceKey)) return false
  if (rule.requiresResolvedKeys?.some((key) => !match.resolvedKeys.includes(key))) return false
  if (rule.excludesResolvedKeys?.some((key) => match.resolvedKeys.includes(key))) return false
  return !rule.preparedCardId || preparedCardId === rule.preparedCardId
}

function createObservation(
  match: SoloMatch,
  action: CaseAction,
  locationId: LocationId,
  entryId: string,
): CaseActionResolution['entry'] {
  const repeatedAttempt = match.journalEntries.some(
    (entry) =>
      entry.type === 'observation' &&
      entry.actionAttempt === action &&
      entry.locationId === locationId,
  )
  const actionLabels: Record<CaseAction, string> = {
    examine: 'Examinar',
    analyse: 'Analisar',
    research: 'Pesquisar',
  }
  const locationLabels: Record<LocationId, string> = {
    gallery: 'Galeria Principal',
    security: 'Sala de Segurança',
    laboratory: 'Laboratório de Restauração',
    office: 'Escritório da Curadoria',
    'service-corridor': 'Corredor de Serviço',
  }
  return {
    id: entryId,
    type: 'observation',
    title: `Sem nova descoberta: ${locationLabels[locationId]}`,
    content: repeatedAttempt
      ? `A equipe já tentou ${actionLabels[action]} neste local sem encontrar novos elementos. Compare as anotações ou escolha outra abordagem.`
      : `A abordagem de ${actionLabels[action]} não trouxe elementos novos neste local. Compare as anotações ou tente um método diferente.`,
    locationId,
    round: match.round,
    status: 'note',
    actionAttempt: action,
  }
}
