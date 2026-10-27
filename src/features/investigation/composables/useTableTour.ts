import { computed, ref } from 'vue'
import { hasSeenTableTour, markTableTourSeen } from '../../../services/onboarding-preferences'

const steps = [
  {
    target: 'investigator',
    title: 'Investigador, PA e Apoio',
    description:
      'Acompanhe seus PA e acione o Apoio de plantão uma vez por rodada para receber uma carta extra com desconto de 1 PA.',
  },
  {
    target: 'locations',
    title: 'Locais e deslocamento',
    description:
      'Selecione um local disponível. O primeiro deslocamento da rodada é gratuito; os seguintes custam 1 PA.',
  },
  {
    target: 'hand',
    title: 'Baralho e cartas temporárias',
    description:
      'O baralho do investigador renova quatro cartas a cada turno. Cartas temporárias e de apoio permanecem no grupo de extras até o uso. Prepare cartas clicando nelas; consulte detalhes pelo botão de informação.',
  },
  {
    target: 'actions',
    title: 'Ações e notificações',
    description:
      'Execute uma ação na cena atual. As notificações confirmam novos registros e permitem abrir o Diário. Encerrar turno renova os PA e a mão regular.',
  },
  {
    target: 'context',
    title: 'Painel contextual',
    description:
      'Alterne entre Pessoas, Diário e Operação na mesma página. Prepare cartas de conversa na mão principal. A aba Operação mostra decisões disponíveis conforme suas linhas avançam.',
  },
  {
    target: 'context',
    title: 'Diário: pistas e hipóteses',
    description:
      'Uma pista registra uma informação encontrada e pode estar em apuração, confirmada ou refutada. A hipótese reúne pistas e relações numa linha de raciocínio; seu estado mostra quanto ela está sustentada.',
  },
  {
    target: 'context',
    title: 'Conexões e operações',
    description:
      'Desenhar uma ligação no mural é grátis e registra uma associação. O cruzamento investigativo testa uma relação e custa PA. Uma operação verifica uma linha plausível ou resolve o encerramento de uma linha sustentada.',
  },
] as const

export type TableTourStep = (typeof steps)[number]
export const tableTourStepCount = steps.length

export function useTableTour() {
  const tourIndex = ref(-1)
  const tourStep = computed(() => steps[tourIndex.value])
  const hasShownFirstTour = ref(hasSeenTableTour())

  function startTour() {
    tourIndex.value = 0
    if (!hasShownFirstTour.value) {
      markTableTourSeen()
      hasShownFirstTour.value = true
    }
  }

  function startTourOnFirstVisit() {
    if (!hasShownFirstTour.value) startTour()
  }

  function closeTour() {
    tourIndex.value = -1
  }

  function stepTour(delta: number) {
    const next = tourIndex.value + delta
    tourIndex.value = next >= steps.length ? -1 : Math.max(0, next)
  }

  return { tourIndex, tourStep, startTour, startTourOnFirstVisit, closeTour, stepTour }
}
