import { computed, ref } from 'vue'

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
      'Alterne entre Pessoas, Diário e Acusação na mesma página. Prepare cartas de conversa na mão principal. O dossiê fica disponível nas Rodadas 5 e 6.',
  },
] as const

export type TableTourStep = (typeof steps)[number]

export function useTableTour() {
  const tourIndex = ref(-1)
  const tourStep = computed(() => steps[tourIndex.value])

  function startTour() {
    tourIndex.value = 0
  }

  function closeTour() {
    tourIndex.value = -1
  }

  function stepTour(delta: number) {
    const next = tourIndex.value + delta
    tourIndex.value = next >= steps.length ? -1 : Math.max(0, next)
  }

  return { tourIndex, tourStep, startTour, closeTour, stepTour }
}
