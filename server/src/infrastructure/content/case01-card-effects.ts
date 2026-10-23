import type { InvestigationAction, LocationId } from '../../../../shared/domain/identifiers.js'
import type {
  CaseActionResolution,
  NewJournalEntry,
} from '../../application/ports/case-content-repository.js'
import type { JournalEntry, SoloMatch } from '../../domain/match.js'

type CardId =
  | 'ultraviolet-flashlight'
  | 'trace-marker'
  | 'route-map'
  | 'access-credential'
  | 'comparative-magnifier'
  | 'forensic-camera'
  | 'custody-envelope'
  | 'trace-reagent'
  | 'marked-transcript'
  | 'contact-card'
  | 'archive-box'
  | 'chronological-thread'
  | 'cross-reference'
  | 'institutional-seal'

const physicalLocations: readonly LocationId[] = ['gallery', 'laboratory', 'service-corridor']
type ResearchCardId = 'access-credential' | 'archive-box' | 'institutional-seal' | 'contact-card'

export function resolveCase01CardEffect(
  match: SoloMatch,
  action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>,
  locationId: LocationId,
  cardId: string | undefined,
  resolution: CaseActionResolution,
): CaseActionResolution {
  if (!isCardId(cardId)) return resolution

  switch (cardId) {
    case 'ultraviolet-flashlight':
      if (action === 'examine' && (locationId === 'gallery' || locationId === 'service-corridor')) {
        return addObservation(
          resolution,
          match,
          locationId,
          'Leitura ultravioleta',
          locationId === 'gallery'
            ? 'A luz revela um rastro fluorescente de óleo e poeira junto à área da exposição.'
            : 'A luz revela um rastro fluorescente de óleo e poeira no piso da passagem de serviço.',
        )
      }
      if (action === 'examine') {
        const contextByLocation: Partial<Record<LocationId, string>> = {
          laboratory:
            'A varredura destaca resíduos antigos de verniz e solvente na bancada de restauração.',
          security:
            'A varredura não encontra resíduos recentes fora dos materiais de limpeza habituais.',
          office: 'A varredura não encontra resíduos anômalos na área administrativa.',
        }
        return addObservation(
          resolution,
          match,
          locationId,
          'Varredura ultravioleta',
          contextByLocation[locationId] ??
            'A varredura registra as condições de luminosidade e resíduos deste ambiente.',
        )
      }
      return cardContextUnavailable(resolution, 'A lanterna não pode ser aplicada a esta ação.')

    case 'route-map':
      if (action !== 'research')
        return cardContextUnavailable(resolution, 'O mapa não pode ser aplicado a esta ação.')
      if (locationId === 'gallery' || locationId === 'security') {
        return {
          ...addObservation(
            resolution,
            match,
            locationId,
            'Trajeto indicado no mapa',
            locationId === 'gallery'
              ? 'O mapa relaciona a circulação da galeria a uma passagem técnica do museu.'
              : 'O mapa relaciona os acessos da segurança às passagens técnicas do museu.',
          ),
          resolvedKeys: ['gallery-service-door'],
          unlockedLocationIds: ['service-corridor'],
          ...connectionForMap(match, resolution.entry),
        }
      }
      return addObservation(
        resolution,
        match,
        locationId,
        'Referência cartográfica',
        `O mapa relaciona este setor (${locationName(locationId)}) às rotas internas do museu.`,
      )

    case 'trace-marker':
      if (action === 'analyse') {
        const target =
          resolution.entry.type === 'clue' &&
          physicalLocations.includes(resolution.entry.locationId) &&
          (resolution.entry.status === 'unconfirmed' || resolution.entry.status === 'indicio')
            ? resolution.entry
            : latestUnconfirmedPhysicalClue(match.journalEntries)
        if (!target) {
          return cardContextUnavailable(
            resolution,
            'É necessário ter uma pista física não confirmada no diário.',
          )
        }
        return {
          ...resolution,
          entry:
            target.id === resolution.entry.id
              ? { ...resolution.entry, markedForFollowUp: true }
              : resolution.entry,
          journalEntryUpdates:
            target.id === resolution.entry.id
              ? resolution.journalEntryUpdates
              : [...(resolution.journalEntryUpdates ?? []), { ...target, markedForFollowUp: true }],
        }
      }
      return cardContextUnavailable(
        resolution,
        'O marcador precisa ser aplicado durante uma análise.',
      )

    case 'access-credential':
      if (action === 'research' && locationId === 'security') {
        const hasLogGap = match.resolvedKeys.includes('security-log-gap')
        const key = hasLogGap ? 'e3-confirmed' : 'security-log-gap'
        return {
          ...resolution,
          entry: {
            ...resolution.entry,
            type: 'clue',
            title: hasLogGap
              ? 'Exclusão de registros confirmada'
              : 'Lacuna no terminal de segurança',
            content: hasLogGap
              ? 'A credencial permite confirmar que a lacuna foi criada no terminal de segurança.'
              : 'A credencial dá acesso ao arquivo preservado e revela um bloco removido do terminal.',
            status: hasLogGap ? 'confirmed' : 'unconfirmed',
            caseEvidenceKey: hasLogGap ? 'e3-confirmed' : undefined,
          },
          resolvedKey: key,
          resolvedKeys: ['gallery-service-door'],
          unlockedLocationIds: ['service-corridor'],
        }
      }
      return researchContextEffect(match, resolution, action, locationId, 'access-credential')

    case 'comparative-magnifier':
    case 'cross-reference': {
      if (action !== 'analyse') return resolution
      const pair = findCluePair(match, resolution.entry, locationId)
      if (!pair)
        return cardContextUnavailable(
          resolution,
          'O diário ainda não contém duas pistas físicas adequadas para comparação.',
        )
      const note =
        cardId === 'comparative-magnifier'
          ? 'A comparação destaca uma característica material em comum entre as duas pistas.'
          : 'O cruzamento relaciona uma evidência confirmada a outra ainda em verificação.'
      const connectionId = `journal-connection:${[pair[0].id, pair[1].id].sort().join(':')}`
      return {
        ...addObservation(
          resolution,
          match,
          locationId,
          cardId === 'comparative-magnifier' ? 'Pistas comparadas' : 'Registros cruzados',
          note,
        ),
        journalConnection: { id: connectionId, fromClueId: pair[0].id, toClueId: pair[1].id },
      }
    }

    case 'forensic-camera': {
      if (action !== 'examine') return resolution
      const target =
        resolution.entry.type === 'clue' ? resolution.entry : latestClue(match.journalEntries)
      if (!target)
        return cardContextUnavailable(
          resolution,
          'O diário ainda não contém uma pista disponível para registro fotográfico.',
        )
      return {
        ...resolution,
        entry:
          target.id === resolution.entry.id
            ? { ...resolution.entry, protectedUntilRound: match.round + 1 }
            : resolution.entry,
        journalEntryUpdates:
          target.id === resolution.entry.id
            ? resolution.journalEntryUpdates
            : [{ ...target, protectedUntilRound: match.round + 1 }],
      }
    }

    case 'custody-envelope': {
      if (action !== 'analyse') return resolution
      const target =
        [...match.journalEntries]
          .reverse()
          .find(
            (entry) =>
              entry.type === 'clue' &&
              entry.status === 'confirmed' &&
              physicalLocations.includes(entry.locationId),
          ) ??
        (resolution.entry.type === 'clue' && resolution.entry.status === 'confirmed'
          ? resolution.entry
          : undefined)
      if (!target)
        return cardContextUnavailable(
          resolution,
          'O diário ainda não contém uma pista física confirmada para proteger.',
        )
      return {
        ...resolution,
        entry:
          target.id === resolution.entry.id
            ? { ...resolution.entry, protectedUntilRound: match.round + 1 }
            : resolution.entry,
        journalEntryUpdates:
          target.id === resolution.entry.id
            ? resolution.journalEntryUpdates
            : [{ ...target, protectedUntilRound: match.round + 1 }],
      }
    }

    case 'trace-reagent': {
      if (action !== 'analyse') return resolution
      const currentClue =
        resolution.entry.type === 'clue' &&
        resolution.entry.status !== 'confirmed' &&
        physicalLocations.includes(resolution.entry.locationId)
          ? resolution.entry
          : latestUnconfirmedPhysicalClue(match.journalEntries)
      if (!currentClue)
        return cardContextUnavailable(
          resolution,
          'O diário ainda não contém uma pista física não confirmada para análise.',
        )
      const isFalseLead = /Marcas nas ferramentas|Avaliação do seguro/.test(currentClue.title)
      const key = resolvedKeyForClue(currentClue)
      const validatedClue = {
        ...currentClue,
        status: isFalseLead ? ('refuted' as const) : ('confirmed' as const),
        content: `${currentClue.content} O reagente ${isFalseLead ? 'refutou' : 'confirmou'} o vestígio físico.`,
        ...(!isFalseLead && isCaseEvidenceKey(key) ? { caseEvidenceKey: key } : {}),
      }
      return {
        ...resolution,
        entry: currentClue.id === resolution.entry.id ? validatedClue : resolution.entry,
        journalEntryUpdates:
          currentClue.id === resolution.entry.id
            ? resolution.journalEntryUpdates
            : [...(resolution.journalEntryUpdates ?? []), validatedClue],
        ...(key ? { resolvedKeys: [...(resolution.resolvedKeys ?? []), key] } : {}),
      }
    }

    case 'marked-transcript': {
      if (action !== 'analyse') return resolution
      const statement = [...match.journalEntries]
        .reverse()
        .find((entry) => entry.type === 'statement')
      const clue = [...match.journalEntries]
        .reverse()
        .find((entry) => entry.type === 'clue' && entry.status === 'confirmed')
      if (!statement || !clue)
        return cardContextUnavailable(
          resolution,
          'O diário precisa conter uma declaração e uma pista confirmada.',
        )
      return addObservation(
        resolution,
        match,
        locationId,
        'Contradição em revisão',
        `A declaração “${statement.title}” foi separada para confronto com “${clue.title}”.`,
      )
    }

    case 'contact-card':
      if (
        action === 'research' &&
        locationId === 'security' &&
        !match.resolvedKeys.includes('e2-confirmed')
      ) {
        return {
          ...resolution,
          entry: {
            ...resolution.entry,
            type: 'clue',
            title: 'Acionamento manual confirmado por fonte externa',
            content:
              'Uma fonte municipal confirma que a interrupção foi iniciada dentro do prédio às 22h14.',
            status: 'confirmed',
            caseEvidenceKey: 'e2-confirmed',
          },
          resolvedKey: 'e2-confirmed',
        }
      }
      return researchContextEffect(match, resolution, action, locationId, 'contact-card')

    case 'archive-box':
      if (
        action === 'research' &&
        locationId === 'security' &&
        !match.resolvedKeys.includes('security-log-gap')
      ) {
        return {
          ...resolution,
          entry: {
            ...resolution.entry,
            type: 'clue',
            title: 'Arquivo da lacuna no terminal',
            content:
              'O arquivo preservado confirma que um bloco foi removido do terminal de segurança às 22h13.',
            status: 'unconfirmed',
            caseEvidenceKey: undefined,
          },
          resolvedKey: 'security-log-gap',
        }
      }
      if (
        action === 'research' &&
        locationId === 'security' &&
        match.resolvedKeys.includes('security-log-gap') &&
        !match.resolvedKeys.includes('e3-confirmed')
      ) {
        return {
          ...resolution,
          entry: {
            ...resolution.entry,
            type: 'clue',
            title: 'Exclusão de registros confirmada no arquivo',
            content:
              'O registro de arquivo confirma que a exclusão foi iniciada no terminal da segurança às 22h13.',
            status: 'confirmed',
            caseEvidenceKey: 'e3-confirmed',
          },
          resolvedKey: 'e3-confirmed',
        }
      }
      return researchContextEffect(match, resolution, action, locationId, 'archive-box')

    case 'chronological-thread': {
      if (action !== 'research') return resolution
      const timedClues = match.journalEntries
        .filter(
          (entry) =>
            entry.type === 'clue' && /22h(?:13|14|16|21)/.test(`${entry.title} ${entry.content}`),
        )
        .slice(-3)
      if (timedClues.length < 2)
        return cardContextUnavailable(
          resolution,
          'O diário ainda não contém duas pistas com horário para organizar.',
        )
      return addObservation(
        resolution,
        match,
        locationId,
        'Sequência temporal organizada',
        `A equipe alinhou ${timedClues.map((entry) => entry.title).join(', ')} e identificou um intervalo que exige explicação.`,
      )
    }

    case 'institutional-seal':
      if (action === 'research' && locationId === 'security') {
        if (!match.resolvedKeys.includes('security-log-gap')) {
          return {
            ...resolution,
            entry: {
              ...resolution.entry,
              type: 'clue',
              title: 'Arquivo oficial da sala de segurança',
              content:
                'O acesso institucional libera o registro de uma lacuna aberta às 22h13 no terminal de segurança.',
              status: 'unconfirmed',
              caseEvidenceKey: undefined,
            },
            resolvedKey: 'security-log-gap',
          }
        }
        if (!match.resolvedKeys.includes('e3-confirmed')) {
          return {
            ...resolution,
            entry: {
              ...resolution.entry,
              type: 'clue',
              title: 'Registro oficial da exclusão',
              content:
                'O documento oficial confirma que a exclusão começou no terminal da segurança às 22h13.',
              status: 'confirmed',
              caseEvidenceKey: 'e3-confirmed',
            },
            resolvedKey: 'e3-confirmed',
          }
        }
      }
      return researchContextEffect(match, resolution, action, locationId, 'institutional-seal')
  }
}

function addObservation(
  resolution: CaseActionResolution,
  match: SoloMatch,
  locationId: LocationId,
  title: string,
  content: string,
): CaseActionResolution {
  const entry: NewJournalEntry = {
    type: 'observation',
    title,
    content,
    locationId,
    round: match.round,
    status: 'note',
  }
  return { ...resolution, additionalEntries: [...(resolution.additionalEntries ?? []), entry] }
}

function researchContextEffect(
  match: SoloMatch,
  resolution: CaseActionResolution,
  action: Exclude<InvestigationAction, 'move' | 'card' | 'converse'>,
  locationId: LocationId,
  cardId: ResearchCardId,
): CaseActionResolution {
  if (action !== 'research')
    return cardContextUnavailable(resolution, 'O recurso não pode ser aplicado a esta ação.')

  if (locationId === 'office') {
    const hasInsuranceRecord = match.resolvedKeys.includes('helena-insurance')
    const key = hasInsuranceRecord ? 'helena-insurance-refuted' : 'helena-insurance'
    if (!match.resolvedKeys.includes(key)) {
      return {
        ...resolution,
        entry: {
          ...resolution.entry,
          type: 'clue',
          title: hasInsuranceRecord ? 'Avaliação do seguro refutada' : 'Avaliação do seguro',
          content: hasInsuranceRecord
            ? 'Os registros institucionais confirmam que a avaliação foi solicitada antes da exposição.'
            : 'Os registros institucionais revelam uma avaliação recente que precisa ser verificada.',
          status: hasInsuranceRecord ? 'refuted' : 'unconfirmed',
        },
        resolvedKey: key,
      }
    }
  }

  if (locationId === 'laboratory') {
    const hasToolRecord = match.resolvedKeys.includes('marta-tools')
    const key = hasToolRecord ? 'marta-tools-refuted' : 'marta-tools'
    if (!match.resolvedKeys.includes(key)) {
      return {
        ...resolution,
        entry: {
          ...resolution.entry,
          type: 'clue',
          title: hasToolRecord ? 'Marcas de restauração refutadas' : 'Marcas nas ferramentas',
          content: hasToolRecord
            ? 'O histórico técnico data as marcas das ferramentas de restauração de antes da ocorrência.'
            : 'O histórico de conservação registra marcas recentes nas ferramentas de restauração.',
          status: hasToolRecord ? 'refuted' : 'unconfirmed',
        },
        resolvedKey: key,
      }
    }
  }

  if (locationId === 'security') {
    if (cardId === 'contact-card' && !match.resolvedKeys.includes('e2-confirmed')) {
      return confirmedClue(
        resolution,
        'Acionamento manual confirmado por fonte externa',
        'e2-confirmed',
      )
    }
    if (
      (cardId === 'archive-box' || cardId === 'institutional-seal') &&
      match.resolvedKeys.includes('security-log-gap') &&
      !match.resolvedKeys.includes('e3-confirmed')
    ) {
      return confirmedClue(
        resolution,
        'Exclusão de registros confirmada no arquivo',
        'e3-confirmed',
      )
    }
  }

  if (locationId === 'gallery' || locationId === 'service-corridor') {
    if (
      locationId === 'service-corridor' &&
      !match.resolvedKeys.includes('corridor-camera-report')
    ) {
      return {
        ...resolution,
        entry: {
          ...resolution.entry,
          type: 'clue',
          title: 'Relatório de manutenção do corredor',
          content:
            'O registro técnico aponta uma falha antiga na câmera da passagem e um reparo adiado.',
          status: 'unconfirmed',
        },
        resolvedKey: 'corridor-camera-report',
      }
    }
    return addObservation(
      resolution,
      match,
      locationId,
      'Registros de manutenção',
      'Os registros consultados relacionam a manutenção deste setor às rotinas de circulação da exposição.',
    )
  }

  return addObservation(
    resolution,
    match,
    locationId,
    'Consulta contextual',
    `O recurso foi aplicado aos registros disponíveis neste setor (${locationName(locationId)}).`,
  )
}

function confirmedClue(
  resolution: CaseActionResolution,
  title: string,
  key: 'e2-confirmed' | 'e3-confirmed',
): CaseActionResolution {
  return {
    ...resolution,
    entry: {
      ...resolution.entry,
      type: 'clue',
      title,
      content: 'O registro consultado confirma a informação.',
      status: 'confirmed',
      caseEvidenceKey: key,
    },
    resolvedKey: key,
  }
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

function connectionForMap(
  match: SoloMatch,
  currentEntry: JournalEntry,
): Pick<CaseActionResolution, 'journalConnection'> {
  const pair = findCluePair(match, currentEntry, currentEntry.locationId)
  if (!pair) return {}
  return {
    journalConnection: {
      id: `journal-connection:${[pair[0].id, pair[1].id].sort().join(':')}`,
      fromClueId: pair[0].id,
      toClueId: pair[1].id,
    },
  }
}

function findCluePair(
  match: SoloMatch,
  currentEntry: JournalEntry,
  locationId: LocationId,
): readonly [JournalEntry, JournalEntry] | undefined {
  const clues = [
    ...match.journalEntries,
    ...(currentEntry.type === 'clue' ? [currentEntry] : []),
  ].filter(
    (entry) =>
      entry.type === 'clue' &&
      entry.status !== 'refuted' &&
      physicalLocations.includes(entry.locationId),
  )
  const confirmed = clues.find((entry) => entry.status === 'confirmed')
  const pending = clues.find(
    (entry) => entry.status === 'unconfirmed' || entry.status === 'indicio',
  )
  if (
    confirmed &&
    pending &&
    confirmed.id !== pending.id &&
    !hasConnection(match, confirmed.id, pending.id)
  ) {
    return [confirmed, pending]
  }
  const local = clues.filter((entry) => entry.locationId === locationId)
  const pair = local.length >= 2 ? ([local[0]!, local[1]!] as const) : undefined
  return pair && !hasConnection(match, pair[0].id, pair[1].id) ? pair : undefined
}

function hasConnection(match: SoloMatch, firstId: string, secondId: string): boolean {
  return match.journalConnections.some(
    (connection) =>
      (connection.fromClueId === firstId && connection.toClueId === secondId) ||
      (connection.fromClueId === secondId && connection.toClueId === firstId),
  )
}

function cardContextUnavailable(
  resolution: CaseActionResolution,
  errorMessage: string,
): CaseActionResolution {
  return { ...resolution, errorMessage }
}

function latestClue(entries: readonly JournalEntry[]): JournalEntry | undefined {
  return [...entries].reverse().find((entry) => entry.type === 'clue')
}

function latestUnconfirmedPhysicalClue(entries: readonly JournalEntry[]): JournalEntry | undefined {
  return [...entries]
    .reverse()
    .find(
      (entry) =>
        entry.type === 'clue' &&
        physicalLocations.includes(entry.locationId) &&
        (entry.status === 'unconfirmed' || entry.status === 'indicio'),
    )
}

function resolvedKeyForClue(entry: JournalEntry): string | undefined {
  if (entry.title.includes('Marcas nas ferramentas')) return 'marta-tools-refuted'
  if (entry.title.includes('Avaliação do seguro')) return 'helena-insurance-refuted'
  if (entry.title.includes('Fechadura de emergência')) return 'e1-confirmed'
  if (entry.title.includes('Acionamento manual')) return 'e2-confirmed'
  if (entry.title.includes('Lacuna no terminal')) return 'e3-confirmed'
  if (entry.title.includes('Rota pelo corredor')) return 'e4-confirmed'
  if (entry.title.includes('Falha de câmera')) return 'e5-confirmed'
  if (entry.title.includes('Retorno do cartão')) return 'e6-confirmed'
  return undefined
}

function isCaseEvidenceKey(
  key: string | undefined,
): key is NonNullable<JournalEntry['caseEvidenceKey']> {
  return (
    key === 'e1-confirmed' ||
    key === 'e2-confirmed' ||
    key === 'e3-confirmed' ||
    key === 'e4-confirmed' ||
    key === 'e5-confirmed' ||
    key === 'e6-confirmed'
  )
}

function isCardId(cardId: string | undefined): cardId is CardId {
  return (
    cardId !== undefined &&
    [
      'ultraviolet-flashlight',
      'trace-marker',
      'route-map',
      'access-credential',
      'comparative-magnifier',
      'forensic-camera',
      'custody-envelope',
      'trace-reagent',
      'marked-transcript',
      'contact-card',
      'archive-box',
      'chronological-thread',
      'cross-reference',
      'institutional-seal',
    ].includes(cardId)
  )
}
