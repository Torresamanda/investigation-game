import type { LocationId } from '../domain/match.js'

export const personIds = ['helena', 'raul', 'marta', 'davi'] as const
export type PersonId = (typeof personIds)[number]
export type ConversationApproach = 'inquiry' | 'pressure' | 'context'
export type ConversationOutcomeStatus = 'recorded' | 'contestable' | 'blocked'

export interface ConversationQuestion {
  readonly id: string
  readonly text: string
  readonly cost: 1 | 2
  readonly approach: ConversationApproach
  readonly result: string
}

interface ConversationDefinition {
  readonly personName: string
  readonly locationId: LocationId
  readonly questions: readonly ConversationQuestion[]
}

// This is server-only case content. It deliberately contains the current
// conversation outcome, never future conditions or the solution of the case.
const conversations: Record<PersonId, ConversationDefinition> = {
  helena: {
    personName: 'Helena Duarte',
    locationId: 'office',
    questions: [
      {
        id: 'institutional-access',
        text: 'Quem podia consultar o acervo esta noite?',
        cost: 2,
        approach: 'pressure',
        result:
          'Helena diz que o acervo exige autorização formal e que os acessos de serviço ficam sob outro setor.',
      },
      {
        id: 'insurance-review',
        text: 'Por que a avaliação do seguro estava em andamento?',
        cost: 2,
        approach: 'inquiry',
        result:
          'Helena afirma que a avaliação foi solicitada para a exposição e pede que o documento seja lido antes de qualquer conclusão.',
      },
      {
        id: 'marta-disagreement',
        text: 'O que houve entre você e Marta?',
        cost: 1,
        approach: 'context',
        result:
          'Helena descreve uma divergência sobre conservação e recomenda verificar o trabalho interrompido no laboratório.',
      },
    ],
  },
  raul: {
    personName: 'Raul Viana',
    locationId: 'security',
    questions: [
      {
        id: 'security-procedure',
        text: 'Como a equipe respondeu ao apagão?',
        cost: 2,
        approach: 'context',
        result:
          'Raul relata que seguiu o protocolo de segurança e direciona a investigação para os registros da sala.',
      },
      {
        id: 'power-failure',
        text: 'O que você sabe sobre a falha de energia?',
        cost: 2,
        approach: 'pressure',
        result:
          'Raul chama a falha de inesperada e sugere conferir a cronologia técnica antes de responsabilizar alguém.',
      },
      {
        id: 'museum-routine',
        text: 'Quem circulava pelas áreas internas?',
        cost: 1,
        approach: 'inquiry',
        result:
          'Raul enumera a rotina de vigilância, mas evita detalhar os deslocamentos durante os sete minutos sem imagem.',
      },
    ],
  },
  marta: {
    personName: 'Marta Lobo',
    locationId: 'laboratory',
    questions: [
      {
        id: 'technical-assessment',
        text: 'Como estava a vitrine na sua última avaliação?',
        cost: 2,
        approach: 'inquiry',
        result:
          'Marta explica que registrou o estado da vitrine antes da abertura e pede que a análise respeite o histórico de conservação.',
      },
      {
        id: 'fingerprints',
        text: 'Por que suas digitais estão próximas à vitrine?',
        cost: 2,
        approach: 'pressure',
        result:
          'Marta confirma o manuseio técnico autorizado e indica que suas ferramentas podem esclarecer a origem de certas marcas.',
      },
      {
        id: 'davi-interest',
        text: 'Davi procurou você por causa do Astrolábio?',
        cost: 1,
        approach: 'context',
        result:
          'Marta conta que Davi fez perguntas sobre a peça, mas ela recusou compartilhar informações técnicas fora do procedimento.',
      },
    ],
  },
  davi: {
    personName: 'Davi Orsini',
    locationId: 'gallery',
    questions: [
      {
        id: 'collectors',
        text: 'Que interesse seus contatos têm na exposição?',
        cost: 2,
        approach: 'inquiry',
        result:
          'Davi diz que colecionadores acompanham a mostra, mas insiste que interesse em patrimônio não equivale a acesso ao museu.',
      },
      {
        id: 'message',
        text: 'Sobre o que tratava a mensagem recebida hoje?',
        cost: 2,
        approach: 'pressure',
        result:
          'Davi afirma que a mensagem tratava de outra negociação e se dispõe a localizar os documentos correspondentes.',
      },
      {
        id: 'helena-sponsorship',
        text: 'Como está sua relação com Helena?',
        cost: 1,
        approach: 'context',
        result:
          'Davi reconhece tensão sobre o patrocínio, mas separa a discussão financeira da rotina de segurança da exposição.',
      },
    ],
  },
}

export function isPersonId(value: unknown): value is PersonId {
  return typeof value === 'string' && personIds.includes(value as PersonId)
}

export function getConversation(personId: PersonId): ConversationDefinition {
  return conversations[personId]
}

export function isPersonAvailableAtLocation(personId: PersonId, locationId: LocationId) {
  return getConversation(personId).locationId === locationId
}

export function resolveConversationOutcome(
  personId: PersonId,
  questionId: string,
  context: { readonly round: number; readonly resolvedKeys: readonly string[] },
): { readonly content: string; readonly status: ConversationOutcomeStatus } | undefined {
  const question = getConversation(personId).questions.find((item) => item.id === questionId)
  if (!question) return undefined

  if (personId === 'marta' && questionId === 'fingerprints') {
    return context.resolvedKeys.includes('gallery-lock')
      ? {
          status: 'recorded',
          content:
            'Diante da abertura interna confirmada, Marta explica que suas digitais vêm do manuseio técnico autorizado e oferece as ferramentas para comparação.',
        }
      : {
          status: 'blocked',
          content:
            'Marta reconhece o manuseio técnico, mas pede que a vitrine seja examinada antes de aceitar uma acusação baseada apenas em digitais.',
        }
  }

  if (personId === 'raul' && questionId === 'power-failure') {
    return context.round >= 3
      ? {
          status: 'contestable',
          content:
            'Raul mantém que a falha foi inesperada, apesar de agora existir motivo para confrontar a versão com a cronologia técnica.',
        }
      : {
          status: 'blocked',
          content:
            'Raul chama a falha de inesperada e evita avançar sem um relatório técnico que sustente a pressão.',
        }
  }

  if (personId === 'davi' && questionId === 'message') {
    return context.round >= 2
      ? {
          status: 'contestable',
          content:
            'Davi afirma que a mensagem trata de outra negociação e aceita localizar documentos para que a versão possa ser verificada.',
        }
      : {
          status: 'blocked',
          content:
            'Davi não aceita discutir mensagens privadas antes que a equipe tenha uma razão concreta para vinculá-las ao desaparecimento.',
        }
  }

  if (personId === 'helena' && questionId === 'institutional-access') {
    return context.resolvedKeys.includes('gallery-lock')
      ? {
          status: 'recorded',
          content:
            'Helena confirma que a chave de emergência não era parte da rotina da curadoria e aponta os protocolos de acesso de serviço.',
        }
      : {
          status: 'blocked',
          content:
            'Helena pede uma evidência concreta antes de detalhar os acessos internos e indica que a vitrine precisa ser examinada primeiro.',
        }
  }

  return { status: 'recorded', content: question.result }
}
