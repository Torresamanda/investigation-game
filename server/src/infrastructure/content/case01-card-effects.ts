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
      if (action === 'examine' && locationId === 'gallery') {
        return addObservation(
          resolution,
          match,
          locationId,
          'Leitura ultravioleta',
          'A luz revela um rastro fluorescente de óleo e poeira que segue do pedestal até a passagem de serviço.',
        )
      }
      return cardContextUnavailable(
        resolution,
        'A Lanterna Ultravioleta exige Examinar a Galeria Principal.',
      )

    case 'trace-marker':
      if (action === 'analyse' && physicalLocations.includes(locationId)) {
        if (
          resolution.entry.type !== 'clue' &&
          !latestUnconfirmedClue(match.journalEntries, locationId)
        ) {
          return cardContextUnavailable(
            resolution,
            'O Marcador de Vestígio exige uma pista física não verificada.',
          )
        }
        return {
          ...resolution,
          entry: { ...resolution.entry, markedForFollowUp: true },
        }
      }
      return cardContextUnavailable(
        resolution,
        'O Marcador de Vestígio exige Analisar uma pista física.',
      )

    case 'route-map':
      if (action === 'research' && locationId === 'gallery' && match.round >= 3) {
        return {
          ...addObservation(
            resolution,
            match,
            locationId,
            'Trajeto indicado no mapa',
            'O mapa de rotas aponta uma passagem técnica entre a galeria e o corredor de serviço.',
          ),
          resolvedKeys: ['gallery-service-door'],
          unlockedLocationIds: ['service-corridor'],
        }
      }
      return cardContextUnavailable(
        resolution,
        'O Mapa de Rotas exige Pesquisar a Galeria a partir da Rodada 3.',
      )

    case 'access-credential':
      if (action === 'research' && locationId === 'security' && match.round >= 3) {
        return {
          ...addObservation(
            resolution,
            match,
            locationId,
            'Acesso de segurança',
            'A credencial libera o arquivo de manutenção e o acesso à passagem técnica.',
          ),
          resolvedKeys: ['gallery-service-door'],
          unlockedLocationIds: ['service-corridor'],
        }
      }
      return cardContextUnavailable(
        resolution,
        'A Credencial de Acesso exige Pesquisar os arquivos de segurança a partir da Rodada 3.',
      )

    case 'comparative-magnifier':
    case 'cross-reference': {
      if (action !== 'analyse') return resolution
      const pair = findCluePair(match, resolution.entry, locationId)
      if (!pair)
        return cardContextUnavailable(
          resolution,
          'A comparação exige duas pistas físicas registradas, sendo uma confirmada e outra em verificação.',
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
        resolution.entry.type === 'clue'
          ? resolution.entry
          : latestClue(match.journalEntries, locationId)
      if (!target)
        return cardContextUnavailable(
          resolution,
          'A Câmera Forense exige uma pista registrada no local examinado.',
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
          'O Envelope de Custódia exige uma pista física confirmada.',
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
      if (action !== 'analyse' || !physicalLocations.includes(locationId)) return resolution
      const currentClue =
        resolution.entry.type === 'clue' && resolution.entry.status !== 'confirmed'
          ? resolution.entry
          : latestUnconfirmedClue(match.journalEntries, locationId)
      if (!currentClue)
        return cardContextUnavailable(
          resolution,
          'O Reagente de Traços exige uma pista física não verificada no local.',
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
          'A Transcrição Marcada exige uma declaração e uma pista confirmada no diário.',
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
        match.round >= 2 &&
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
          },
          resolvedKey: 'e2-confirmed',
        }
      }
      return cardContextUnavailable(
        resolution,
        'O Cartão de Contato exige Pesquisar a Sala de Segurança a partir da Rodada 2.',
      )

    case 'archive-box':
      if (
        action === 'research' &&
        locationId === 'security' &&
        match.round >= 2 &&
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
          },
          resolvedKey: 'security-log-gap',
        }
      }
      if (
        action === 'research' &&
        locationId === 'security' &&
        match.round >= 3 &&
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
          },
          resolvedKey: 'e3-confirmed',
        }
      }
      return cardContextUnavailable(
        resolution,
        'A Caixa de Arquivo exige Pesquisar os registros da Sala de Segurança a partir da Rodada 2.',
      )

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
          'O Fio Cronológico exige ao menos duas pistas com horário no diário.',
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
      if (action === 'research' && locationId === 'security' && match.round >= 2) {
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
            },
            resolvedKey: 'e3-confirmed',
          }
        }
      }
      return cardContextUnavailable(
        resolution,
        'O Selo Institucional exige Pesquisar os arquivos oficiais da Sala de Segurança a partir da Rodada 2.',
      )
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

function latestClue(
  entries: readonly JournalEntry[],
  locationId: LocationId,
): JournalEntry | undefined {
  return [...entries]
    .reverse()
    .find((entry) => entry.type === 'clue' && entry.locationId === locationId)
}

function latestUnconfirmedClue(
  entries: readonly JournalEntry[],
  locationId: LocationId,
): JournalEntry | undefined {
  return [...entries]
    .reverse()
    .find(
      (entry) =>
        entry.type === 'clue' &&
        entry.locationId === locationId &&
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
