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
} from '../../../shared/domain/identifiers.js'
import type { SoloMatch } from '../../domain/match.js'
import { resolveCase01CardEffect } from './case01-card-effects.js'
import type { OperationOption } from '../../domain/investigation-operation.js'

export class Case01ContentRepository implements CaseContentRepository {
  getAvailableOperations(match: SoloMatch): readonly OperationOption[] {
    const hasPlausibleHypothesis = match.hypotheses?.some(
      (hypothesis) => hypothesis.status === 'plausible' || hypothesis.status === 'sustained',
    )
    const hasSustainedHypothesis = match.hypotheses?.some(
      (hypothesis) => hypothesis.status === 'sustained',
    )
    return [
      ...(hasPlausibleHypothesis
        ? [
            {
              id: 'verify-the-theory',
              kind: 'verify' as const,
              title: 'Verificar a linha de raciocínio',
              riskDescription: 'A verificação pode revelar uma inconsistência recuperável.',
            },
          ]
        : []),
      ...(hasSustainedHypothesis
        ? [
            {
              id: 'preserve-the-evidence',
              kind: 'closure' as const,
              title: 'Preservar a prova',
              riskDescription: 'A operação pode revelar uma inconsistência na linha de raciocínio.',
            },
          ]
        : []),
    ]
  }

  resolveOperation(match: SoloMatch, operationId: string, hypothesisId: string) {
    const isResolved = Boolean(
      operationId === 'preserve-the-evidence' &&
      hypothesisId === 'case01-primary-operation' &&
      match.hypotheses?.some(
        (hypothesis) => hypothesis.id === hypothesisId && hypothesis.status === 'sustained',
      ),
    )
    return {
      isResolved,
      observation:
        'A operação revelou uma inconsistência na linha de raciocínio. Reavalie as evidências já reunidas antes de tentar outra abordagem.',
    }
  }
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

  getConversationReward(personId: PersonId, questionId: string) {
    return getConversationReward(personId, questionId)
  }

  resolveAction(
    match: SoloMatch,
    action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>,
    locationId: LocationId,
  ): CaseActionResolution {
    const resolution = this.resolveCaseAction(match, action, locationId)
    const preparedCardId = match.decks[match.activeInvestigatorId].hand.find(
      (card) => card.instanceId === match.preparedCardInstanceId,
    )?.definitionId
    return resolveCase01CardEffect(match, action, locationId, preparedCardId, resolution)
  }

  private resolveCaseAction(
    match: SoloMatch,
    action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>,
    locationId: LocationId,
  ): CaseActionResolution {
    const entryId = `journal-${match.journalEntries.length + 1}`
    const has = (key: string) => match.resolvedKeys.includes(key)
    const cardId = match.decks[match.activeInvestigatorId].hand.find(
      (card) => card.instanceId === match.preparedCardInstanceId,
    )?.definitionId
    const makeEntry = (
      key: string,
      title: string,
      content: string,
      status: 'indicio' | 'unconfirmed' | 'confirmed' | 'refuted',
    ): CaseActionResolution => ({
      resolvedKey: key,
      entry: {
        id: entryId,
        type: 'clue',
        title,
        content,
        locationId,
        round: match.round,
        status,
        ...(isCaseEvidenceKey(key) && status === 'confirmed' ? { caseEvidenceKey: key } : {}),
      },
    })
    const observation: CaseActionResolution = {
      entry: {
        id: entryId,
        type: 'observation',
        title: `Sem nova descoberta: ${locationName(locationId)}`,
        content: `A ação ${actionLabel(action)} não revelou informação nova neste local.`,
        locationId,
        round: match.round,
        status: 'note',
      },
    }

    if (locationId === 'gallery' && action === 'examine') {
      if (!has('gallery-lock'))
        return makeEntry(
          'gallery-lock',
          'Fechadura de emergência da vitrine',
          'A fechadura interna não apresenta dano; o mecanismo foi operado por dentro.',
          'unconfirmed',
        )
      if (!has('gallery-pedestal'))
        return makeEntry(
          'gallery-pedestal',
          'Vestígio no pedestal',
          'Óleo escuro e pó fino seguem em direção à porta de serviço.',
          'indicio',
        )
      if (match.round >= 3 && !has('gallery-service-door'))
        return makeEntry(
          'gallery-service-door',
          'Porta de serviço',
          'Uma chapa solta revela poeira deslocada e uma marca de carrinho junto à passagem.',
          'unconfirmed',
        )
    }
    if (
      locationId === 'gallery' &&
      action === 'analyse' &&
      has('gallery-lock') &&
      !has('e1-confirmed')
    ) {
      return makeEntry(
        'e1-confirmed',
        'Chave de emergência confirmada',
        'A inspeção confirma que a vitrine foi aberta pelo mecanismo interno, sem arrombamento.',
        'confirmed',
      )
    }
    if (locationId === 'security' && action === 'research') {
      if (!has('security-initial-report'))
        return makeEntry(
          'security-initial-report',
          'Relatório inicial do apagão',
          'Os registros situam a interrupção entre 22h14 e 22h21.',
          'unconfirmed',
        )
      if (match.round >= 2 && !has('security-log-gap'))
        return makeEntry(
          'security-log-gap',
          'Lacuna no terminal',
          'Um bloco de registros desapareceu do terminal pouco antes do apagão.',
          'unconfirmed',
        )
      if (match.round >= 4 && !has('e6-confirmed'))
        return makeEntry(
          'e6-confirmed',
          'Retorno do cartão de acesso',
          'O cartão de Raul registrou retorno à sala às 22h16, sem passagem correspondente pelo acesso público.',
          'confirmed',
        )
    }
    if (locationId === 'security' && action === 'analyse') {
      if (match.round >= 3 && !has('e2-confirmed'))
        return makeEntry(
          'e2-confirmed',
          'Acionamento manual confirmado',
          'A cronologia técnica confirma que o comando de interrupção foi acionado dentro do prédio às 22h14.',
          'confirmed',
        )
      if (match.round >= 3 && has('security-log-gap') && !has('e3-confirmed'))
        return makeEntry(
          'e3-confirmed',
          'Exclusão de registros confirmada',
          'A lacuna foi criada no terminal da sala de segurança às 22h13.',
          'confirmed',
        )
    }
    if (locationId === 'laboratory' && (action === 'examine' || action === 'analyse')) {
      if (!has('marta-tools'))
        return makeEntry(
          'marta-tools',
          'Marcas nas ferramentas',
          'As ferramentas de restauração podem explicar marcas encontradas perto da vitrine.',
          'unconfirmed',
        )
      if (
        !has('marta-tools-refuted') &&
        (cardId === 'treatment-sheet' || (action === 'analyse' && has('gallery-lock')))
      )
        return makeEntry(
          'marta-tools-refuted',
          'Marcas de restauração refutadas',
          'O registro técnico data as marcas da semana anterior à ocorrência.',
          'refuted',
        )
    }
    if (locationId === 'office' && action === 'research') {
      if (!has('helena-insurance'))
        return makeEntry(
          'helena-insurance',
          'Avaliação do seguro',
          'A avaliação recente poderia parecer ligada ao desaparecimento e exige verificação documental.',
          'unconfirmed',
        )
      if (!has('helena-insurance-refuted') && (cardId === 'curator-agenda' || match.round >= 2))
        return makeEntry(
          'helena-insurance-refuted',
          'Avaliação do seguro refutada',
          'O documento confirma que a avaliação foi solicitada antes da exposição.',
          'refuted',
        )
    }
    if (locationId === 'service-corridor' && has('gallery-service-door')) {
      if (action === 'examine' && match.round >= 3 && !has('e4-confirmed'))
        return makeEntry(
          'e4-confirmed',
          'Rota pelo corredor confirmada',
          'Óleo recente acompanha as marcas do carrinho até a área técnica, sem sinal de passagem pelo acesso público.',
          'confirmed',
        )
      if (action === 'research' && match.round >= 4 && !has('corridor-camera-report'))
        return makeEntry(
          'corridor-camera-report',
          'Relatório da câmera',
          'Um relatório antigo registra a câmera do corredor inoperante e a correção adiada.',
          'unconfirmed',
        )
      if (
        action === 'analyse' &&
        match.round >= 5 &&
        has('e4-confirmed') &&
        !has('corridor-oil-confirmed')
      )
        return makeEntry(
          'corridor-oil-confirmed',
          'Resíduo do corredor analisado',
          'O óleo corresponde ao lubrificante dos carrinhos da equipe técnica.',
          'confirmed',
        )
      if (action === 'analyse' && has('corridor-camera-report') && !has('e5-confirmed'))
        return makeEntry(
          'e5-confirmed',
          'Falha de câmera confirmada',
          'O relatório técnico confirma que a falha foi conhecida e não formalizada.',
          'confirmed',
        )
    }

    return observation
  }
}

function isCaseEvidenceKey(
  key: string,
): key is NonNullable<SoloMatch['journalEntries'][number]['caseEvidenceKey']> {
  return (
    key === 'e1-confirmed' ||
    key === 'e2-confirmed' ||
    key === 'e3-confirmed' ||
    key === 'e4-confirmed' ||
    key === 'e5-confirmed' ||
    key === 'e6-confirmed'
  )
}

function locationName(locationId: LocationId): string {
  const names: Record<LocationId, string> = {
    gallery: 'Galeria Principal',
    security: 'Sala de Segurança',
    laboratory: 'Laboratório de Restauração',
    office: 'Escritório da Curadoria',
    'service-corridor': 'Corredor de Serviço',
  }
  return names[locationId]
}

function actionLabel(action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>): string {
  const labels = { examine: 'Examinar', analyse: 'Analisar', research: 'Pesquisar' }
  return labels[action]
}
