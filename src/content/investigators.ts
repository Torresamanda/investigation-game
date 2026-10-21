export const investigators = [
  {
    id: 'livia',
    portrait: 'livia-serrano',
    name: 'Lívia Serrano',
    specialty: 'Campo',
    initials: 'LS',
    points: '5 PA gerais',
  },
  {
    id: 'rafael',
    portrait: 'dr-rafael-monteiro',
    name: 'Dr. Rafael Monteiro',
    specialty: 'Perícia',
    initials: 'RM',
    points: '4 gerais + 1 técnico',
  },
  {
    id: 'isadora',
    portrait: 'isadora-queiroz',
    name: 'Isadora Queiroz',
    specialty: 'Entrevistas',
    initials: 'IQ',
    points: '4 gerais + 1 social',
  },
  {
    id: 'otavio',
    portrait: 'otavio-leme',
    name: 'Otávio Leme',
    specialty: 'Pesquisa',
    initials: 'OL',
    points: '3 gerais + 2 de pesquisa',
  },
] as const

export type InvestigatorId = (typeof investigators)[number]['id']

export type Investigator = (typeof investigators)[number]
