import type { InvestigatorId } from './investigators'
import flashlight from '../../assets/cards/lanterna-ultravioleta.png'
import marker from '../../assets/cards/marcador-evidencia.png'
import map from '../../assets/cards/mapa-museu.png'
import credential from '../../assets/cards/credencial-acesso.png'
import magnifier from '../../assets/cards/lupa-forense.png'
import camera from '../../assets/cards/camera-forense.png'
import envelope from '../../assets/cards/envelope-custodia.png'
import reagent from '../../assets/cards/frasco-de-reagente.png'
import recorder from '../../assets/cards/gravador.png'
import pause from '../../assets/cards/ampulheta.png'
import transcript from '../../assets/cards/depoimento.png'
import contact from '../../assets/cards/cartao-de-contato.png'
import archive from '../../assets/cards/caixa-de-arquivos.png'
import chronology from '../../assets/cards/quadro-de-cortica.png'
import records from '../../assets/cards/cruzamento-de-registro.png'
import seal from '../../assets/cards/selo-institucional.png'

export interface CardDefinition {
  readonly id: string
  readonly name: string
  readonly cost: 0 | 1 | 2
  readonly effect: string
  readonly context: string
  readonly image: string
}

// The explicit mapping keeps the existing artwork filenames independent from game terminology.
const investigatorCards = {
  livia: [
    {
      id: 'ultraviolet-flashlight',
      name: 'Lanterna Ultravioleta',
      cost: 1,
      image: flashlight,
      effect: 'Ao examinar um local, revela um detalhe físico oculto, se houver.',
      context: 'Durante Examinar um local.',
    },
    {
      id: 'trace-marker',
      name: 'Marcador de Vestígio',
      cost: 0,
      image: marker,
      effect: 'Marca uma pista física; a próxima análise dessa pista custa 1 PA a menos.',
      context: 'Exige uma pista física.',
    },
    {
      id: 'route-map',
      name: 'Mapa de Rotas',
      cost: 1,
      image: map,
      effect: 'Revela uma conexão útil entre o local atual e outro local investigável.',
      context: 'Exige um local atual e outro local investigável.',
    },
    {
      id: 'access-credential',
      name: 'Credencial de Acesso',
      cost: 2,
      image: credential,
      effect: 'Abre uma área ou arquivo restrito sem exigir uma ação adicional de acesso.',
      context: 'Exige uma área ou arquivo restrito.',
    },
  ],
  rafael: [
    {
      id: 'comparative-magnifier',
      name: 'Lupa Comparativa',
      cost: 1,
      image: magnifier,
      effect: 'Compara duas pistas físicas e revela uma característica em comum, se existir.',
      context: 'Exige duas pistas físicas.',
    },
    {
      id: 'forensic-camera',
      name: 'Câmera Forense',
      cost: 1,
      image: camera,
      effect:
        'Registra uma evidência; ela não pode ser alterada por um evento do caso até a próxima rodada.',
      context: 'Exige uma evidência.',
    },
    {
      id: 'custody-envelope',
      name: 'Envelope de Custódia',
      cost: 0,
      image: envelope,
      effect: 'Protege uma evidência confirmada contra uma penalidade ou descarte.',
      context: 'Exige uma evidência confirmada.',
    },
    {
      id: 'trace-reagent',
      name: 'Reagente de Traços',
      cost: 2,
      image: reagent,
      effect: 'Valida ou invalida uma pista física não verificada.',
      context: 'Exige uma pista física não verificada.',
    },
  ],
  isadora: [
    {
      id: 'pocket-recorder',
      name: 'Gravador de Bolso',
      cost: 1,
      image: recorder,
      effect: 'Registra um depoimento; ele poderá ser confrontado com outra declaração depois.',
      context: 'Exige um depoimento.',
    },
    {
      id: 'calculated-pause',
      name: 'Pausa Calculada',
      cost: 0,
      image: pause,
      effect: 'Após uma conversa, realiza uma pergunta adicional sem custo de PA.',
      context: 'Após uma conversa, no próprio turno.',
    },
    {
      id: 'marked-transcript',
      name: 'Transcrição Marcada',
      cost: 1,
      image: transcript,
      effect: 'Reabre uma declaração registrada e procura uma contradição com outra pista.',
      context: 'Exige uma declaração registrada e outra pista.',
    },
    {
      id: 'contact-card',
      name: 'Cartão de Contato',
      cost: 2,
      image: contact,
      effect:
        'Obtém uma informação confiável de uma fonte externa, ligada ao tema da investigação.',
      context: 'Exige um tema de investigação.',
    },
  ],
  otavio: [
    {
      id: 'archive-box',
      name: 'Caixa de Arquivo',
      cost: 1,
      image: archive,
      effect: 'Pesquisa um registro e revela um documento ou dado contextual ligado ao caso.',
      context: 'Exige um registro pesquisável.',
    },
    {
      id: 'chronological-thread',
      name: 'Fio Cronológico',
      cost: 1,
      image: chronology,
      effect: 'Organiza até três pistas e revela uma lacuna temporal relevante, se existir.',
      context: 'Exige pistas para organizar na cronologia.',
    },
    {
      id: 'cross-reference',
      name: 'Cruzamento de Registros',
      cost: 1,
      image: records,
      effect:
        'Conecta uma pista confirmada a uma não verificada e revela um local ou pergunta relevante.',
      context: 'Exige uma pista confirmada e uma não verificada.',
    },
    {
      id: 'institutional-seal',
      name: 'Selo Institucional',
      cost: 2,
      image: seal,
      effect: 'Solicita acesso formal a um arquivo oficial ou área documental restrita.',
      context: 'Exige um arquivo oficial ou área documental restrita.',
    },
  ],
} as const satisfies Record<InvestigatorId, readonly CardDefinition[]>

export function getInvestigatorCards(investigator: InvestigatorId): readonly CardDefinition[] {
  return investigatorCards[investigator]
}

export const COPIES_PER_CARD = 2
export const INITIAL_HAND_SIZE = 4

export function createInvestigatorDeck(investigator: InvestigatorId) {
  return getInvestigatorCards(investigator).flatMap((card) =>
    Array.from({ length: COPIES_PER_CARD }, (_, copy) => ({
      instanceId: `${investigator}:${card.id}:${copy + 1}`,
      ownerId: investigator,
      definition: card,
    })),
  )
}
