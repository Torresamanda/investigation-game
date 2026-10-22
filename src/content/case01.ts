import galleryArtwork from '../../assets/locations/galeria-principal.png'
import securityArtwork from '../../assets/locations/sala-de-seguranca.png'
import laboratoryArtwork from '../../assets/locations/laboratorio-de-restauracao.png'
import officeArtwork from '../../assets/locations/escritorio-de-curadoria.png'

export const locations = [
  {
    id: 'gallery',
    name: 'Galeria Principal',
    detail: 'Uma vitrine intacta. Um lugar vazio.',
    artwork: galleryArtwork,
  },
  {
    id: 'security',
    name: 'Sala de Segurança',
    detail: 'Monitores silenciosos e registros à espera de leitura.',
    artwork: securityArtwork,
  },
  {
    id: 'laboratory',
    name: 'Laboratório de Restauração',
    detail: 'Instrumentos delicados, vestígios e trabalho interrompido.',
    artwork: laboratoryArtwork,
  },
  {
    id: 'office',
    name: 'Escritório da Curadoria',
    detail: 'Documentos, compromissos e interesses institucionais.',
    artwork: officeArtwork,
  },
] as const

// Public introductions only. Evidence, relationships and the solution stay out of this catalog.
export const suspectProfiles = [
  {
    id: 'helena',
    locationId: 'office',
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
    locationId: 'security',
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
    locationId: 'laboratory',
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
    locationId: 'gallery',
    name: 'Davi Orsini',
    initials: 'DO',
    portrait: 'davi-orsini',
    role: 'Colecionador e patrocinador',
    personality: 'Carismático · Calculado',
    introduction:
      'Colecionador de antiguidades e patrocinador da exposição. Mantém um interesse especial no Astrolábio de Navor.',
  },
] as const

export type { LocationId } from '../../shared/domain/identifiers'
export type CaseLocation = (typeof locations)[number]
export type Suspect = (typeof suspectProfiles)[number]
export type SuspectId = Suspect['id']

export const roundOpenings = [
  {
    speaker: 'Sofia Moura · Abertura da Rodada 1',
    message:
      '“Sete minutos sem imagem. A vitrine está intacta por fora, e isso elimina qualquer explicação simples.”',
    event: 'Perímetro preservado: o primeiro Examinar na Galeria revela um detalhe adicional.',
  },
  {
    speaker: 'Sofia Moura · Abertura da Rodada 2',
    message: '“Alguém dentro do museu está controlando a narrativa — ou tentando fazê-lo.”',
    event: 'Vazamento para a imprensa: conversas exigem atenção redobrada.',
  },
  {
    speaker: 'Sofia Moura · Abertura da Rodada 3',
    message: '“A rede externa não caiu. O apagão começou dentro do prédio.”',
    event: 'Comando manual: a porta de serviço da Galeria pode ser investigada.',
  },
  {
    speaker: 'Sofia Moura · Abertura da Rodada 4',
    message: '“Ainda podemos reter Raul para esclarecimentos, mas não por muito tempo.”',
    event: 'Janela de acusação: ela será desbloqueada após o encerramento desta rodada.',
  },
  {
    speaker: 'Sofia Moura · Abertura da Rodada 5',
    message: '“O que parecia uma falha isolada agora parece uma sequência.”',
    event: 'Linha do tempo consolidada: uma conexão entre pistas pode ser registrada sem custo.',
  },
  {
    speaker: 'Sofia Moura · Abertura da Rodada 6',
    message: '“Esta é a última janela para entregar um dossiê que se sustente.”',
    event: 'Prazo final: não surgem novas pistas nesta rodada.',
  },
] as const
