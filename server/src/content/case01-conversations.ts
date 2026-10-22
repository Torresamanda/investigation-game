import type { LocationId } from '../domain/match.js'

export const personIds = ['helena', 'raul', 'marta', 'davi'] as const
export type PersonId = (typeof personIds)[number]

export interface ConversationQuestion {
  readonly id: string
  readonly text: string
  readonly cost: 1 | 2
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
        result:
          'Helena diz que o acervo exige autorização formal e que os acessos de serviço ficam sob outro setor.',
      },
      {
        id: 'insurance-review',
        text: 'Por que a avaliação do seguro estava em andamento?',
        cost: 2,
        result:
          'Helena afirma que a avaliação foi solicitada para a exposição e pede que o documento seja lido antes de qualquer conclusão.',
      },
      {
        id: 'marta-disagreement',
        text: 'O que houve entre você e Marta?',
        cost: 1,
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
        result:
          'Raul relata que seguiu o protocolo de segurança e direciona a investigação para os registros da sala.',
      },
      {
        id: 'power-failure',
        text: 'O que você sabe sobre a falha de energia?',
        cost: 2,
        result:
          'Raul chama a falha de inesperada e sugere conferir a cronologia técnica antes de responsabilizar alguém.',
      },
      {
        id: 'museum-routine',
        text: 'Quem circulava pelas áreas internas?',
        cost: 1,
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
        result:
          'Marta explica que registrou o estado da vitrine antes da abertura e pede que a análise respeite o histórico de conservação.',
      },
      {
        id: 'fingerprints',
        text: 'Por que suas digitais estão próximas à vitrine?',
        cost: 2,
        result:
          'Marta confirma o manuseio técnico autorizado e indica que suas ferramentas podem esclarecer a origem de certas marcas.',
      },
      {
        id: 'davi-interest',
        text: 'Davi procurou você por causa do Astrolábio?',
        cost: 1,
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
        result:
          'Davi diz que colecionadores acompanham a mostra, mas insiste que interesse em patrimônio não equivale a acesso ao museu.',
      },
      {
        id: 'message',
        text: 'Sobre o que tratava a mensagem recebida hoje?',
        cost: 2,
        result:
          'Davi afirma que a mensagem tratava de outra negociação e se dispõe a localizar os documentos correspondentes.',
      },
      {
        id: 'helena-sponsorship',
        text: 'Como está sua relação com Helena?',
        cost: 1,
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
