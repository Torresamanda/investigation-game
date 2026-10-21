export const locations = [
  {
    id: 'gallery',
    name: 'Galeria Principal',
    detail: 'Uma vitrine intacta. Um lugar vazio.',
    symbol: '◇',
  },
  {
    id: 'security',
    name: 'Sala de Segurança',
    detail: 'Monitores silenciosos e registros à espera de leitura.',
    symbol: '▤',
  },
  {
    id: 'laboratory',
    name: 'Laboratório de Restauração',
    detail: 'Instrumentos delicados, vestígios e trabalho interrompido.',
    symbol: '⌕',
  },
  {
    id: 'office',
    name: 'Escritório da Curadoria',
    detail: 'Documentos, compromissos e interesses institucionais.',
    symbol: '▱',
  },
] as const

// Public introductions only. Evidence, relationships and the solution stay out of this catalog.
export const suspectProfiles = [
  {
    id: 'helena',
    name: 'Helena Duarte',
    initials: 'HD',
    portrait: 'helena-duarte',
    role: 'Curadora-chefe',
    personality: 'Controlada · Sob pressão',
    introduction:
      'Responsável pela curadoria do Museu de História de Véspera. Sua carreira está ligada ao êxito da exposição.',
  },
  {
    id: 'raul',
    name: 'Raul Viana',
    initials: 'RV',
    portrait: 'raul-viana',
    role: 'Chefe de segurança',
    personality: 'Cansado · Tenso',
    introduction:
      'Responsável pela segurança do museu. Apresenta-se como um funcionário sobrecarregado pela falha de energia.',
  },
  {
    id: 'marta',
    name: 'Marta Lobo',
    initials: 'ML',
    portrait: 'marta-lobo',
    role: 'Restauradora',
    personality: 'Cuidadosa · Franca',
    introduction:
      'Restauradora responsável pelo Astrolábio de Navor. Técnica e comprometida com a conservação do patrimônio.',
  },
  {
    id: 'davi',
    name: 'Davi Orsini',
    initials: 'DO',
    portrait: 'davi-orsini',
    role: 'Colecionador e patrocinador',
    personality: 'Carismático · Calculado',
    introduction:
      'Colecionador de antiguidades e patrocinador da exposição. Mantém um interesse especial no Astrolábio de Navor.',
  },
] as const

export type LocationId = (typeof locations)[number]['id']
export type CaseLocation = (typeof locations)[number]
export type Suspect = (typeof suspectProfiles)[number]
export type SuspectId = Suspect['id']
