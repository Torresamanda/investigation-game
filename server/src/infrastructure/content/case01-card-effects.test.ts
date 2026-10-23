import { describe, expect, it } from 'vitest'
import type { InvestigatorId, LocationId } from '../../../../shared/domain/identifiers.js'
import { MatchService } from '../../application/match-service.js'
import type { JournalEntry } from '../../domain/match.js'
import { InMemoryMatchRepository } from '../persistence/in-memory-match-repository.js'

function prepareCard(
  investigatorId: InvestigatorId,
  cardId: string,
  options: {
    round?: number
    locationId?: LocationId
    journalEntries?: readonly JournalEntry[]
    resolvedKeys?: readonly string[]
  } = {},
) {
  const repository = new InMemoryMatchRepository()
  let nextId = 0
  const service = new MatchService(repository, undefined, () => `case-card-${++nextId}`)
  const match = service.createSoloMatch({
    activeInvestigatorId: investigatorId,
    supportInvestigatorId: investigatorId === 'livia' ? 'rafael' : 'livia',
  })
  const activeDeck = match.decks[investigatorId]
  const card = [...activeDeck.hand, ...activeDeck.drawPile].find(
    (deckCard) => deckCard.definitionId === cardId,
  )
  if (!card) throw new Error(`A carta ${cardId} não foi criada.`)
  repository.save({
    ...match,
    round: options.round ?? match.round,
    currentLocationId: options.locationId ?? 'gallery',
    unlockedLocations: [...new Set([...match.unlockedLocations, options.locationId ?? 'gallery'])],
    journalEntries: options.journalEntries ?? [],
    resolvedKeys: options.resolvedKeys ?? [],
    decks: {
      ...match.decks,
      [investigatorId]: {
        ...activeDeck,
        hand: activeDeck.hand.some((handCard) => handCard.instanceId === card.instanceId)
          ? activeDeck.hand
          : [...activeDeck.hand, card],
        drawPile: activeDeck.drawPile.filter((drawCard) => drawCard.instanceId !== card.instanceId),
      },
    },
  })
  service.prepareCard(match.id, card.instanceId)
  return { service, match, card }
}

function clue(
  id: string,
  title: string,
  locationId: JournalEntry['locationId'],
  status: JournalEntry['status'],
  content = 'Uma pista registrada.',
): JournalEntry {
  return { id, type: 'clue', title, content, locationId, round: 1, status }
}

describe('efeitos das cartas iniciais do Caso 01', () => {
  it('revela um detalhe adicional com a Lanterna Ultravioleta', () => {
    const { service, match } = prepareCard('livia', 'ultraviolet-flashlight')

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'examine',
      locationId: 'gallery',
    })

    expect(updated.journalEntries.at(-1)).toMatchObject({
      title: 'Leitura ultravioleta',
      type: 'observation',
    })
  })

  it('marca uma pista física sem descontar o custo da própria análise', () => {
    const { service, match } = prepareCard('livia', 'trace-marker', {
      journalEntries: [clue('marked-target', 'Vestígio registrado', 'gallery', 'unconfirmed')],
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'gallery',
    })

    expect(updated.actionPoints.general).toBe(3)
    expect(updated.journalEntries.find((entry) => entry.id === 'marked-target')).toMatchObject({
      markedForFollowUp: true,
    })
  })

  it('libera a rota do corredor com o Mapa de Rotas ou a Credencial de Acesso', () => {
    for (const [investigator, cardId, locationId] of [
      ['livia', 'route-map', 'gallery'],
      ['livia', 'access-credential', 'security'],
    ] as const) {
      const { service, match } = prepareCard(investigator, cardId, {
        round: 3,
        locationId,
      })
      const updated = service.resolveAction({ matchId: match.id, action: 'research', locationId })
      expect(updated.unlockedLocations).toContain('service-corridor')
      expect(updated.resolvedKeys).toContain('gallery-service-door')
    }
  })

  it('cria uma conexão formal ao comparar pistas com a Lupa Comparativa', () => {
    const { service, match } = prepareCard('rafael', 'comparative-magnifier', {
      locationId: 'laboratory',
      journalEntries: [
        clue('confirmed-physical', 'Vestígio confirmado', 'gallery', 'confirmed'),
        clue('pending-physical', 'Vestígio pendente', 'laboratory', 'unconfirmed'),
      ],
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'laboratory',
    })

    expect(updated.journalConnections).toHaveLength(1)
    expect(updated.journalEntries.at(-1)).toMatchObject({ title: 'Pistas comparadas' })
  })

  it('registra no Diário o vínculo gerado pelo Mapa de Rotas', () => {
    const { service, match } = prepareCard('livia', 'route-map', {
      locationId: 'gallery',
      journalEntries: [
        clue('route-confirmed', 'Vestígio confirmado', 'gallery', 'confirmed'),
        clue('route-pending', 'Vestígio pendente', 'laboratory', 'unconfirmed'),
      ],
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'research',
      locationId: 'gallery',
    })

    expect(updated.journalConnections).toContainEqual(
      expect.objectContaining({
        fromClueId: 'route-confirmed',
        toClueId: 'route-pending',
      }),
    )
  })

  it('protege uma evidência fotografada ou sob custódia até a próxima rodada', () => {
    const camera = prepareCard('rafael', 'forensic-camera')
    const photographed = camera.service.resolveAction({
      matchId: camera.match.id,
      action: 'examine',
      locationId: 'gallery',
    })
    expect(photographed.journalEntries.find((entry) => entry.type === 'clue')).toMatchObject({
      protectedUntilRound: 2,
    })

    const envelope = prepareCard('rafael', 'custody-envelope', {
      locationId: 'laboratory',
      journalEntries: [clue('protected-clue', 'Pista confirmada', 'gallery', 'confirmed')],
    })
    const secured = envelope.service.resolveAction({
      matchId: envelope.match.id,
      action: 'analyse',
      locationId: 'laboratory',
    })
    expect(secured.journalEntries.find((entry) => entry.id === 'protected-clue')).toMatchObject({
      protectedUntilRound: 2,
    })
  })

  it('valida uma pista falsa com o Reagente de Traços', () => {
    const { service, match } = prepareCard('rafael', 'trace-reagent', { locationId: 'laboratory' })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'laboratory',
    })

    expect(updated.journalEntries.at(-1)).toMatchObject({
      title: 'Marcas nas ferramentas',
      status: 'refuted',
    })
    expect(updated.resolvedKeys).toContain('marta-tools-refuted')
  })

  it('cruza uma declaração e uma evidência com a Transcrição Marcada', () => {
    const { service, match } = prepareCard('isadora', 'marked-transcript', {
      locationId: 'security',
      journalEntries: [
        { ...clue('confirmed-record', 'Registro confirmado', 'security', 'confirmed'), round: 2 },
        {
          id: 'statement-1',
          type: 'statement',
          title: 'Declaração de Raul',
          content: 'Versão registrada.',
          locationId: 'security',
          round: 2,
          status: 'recorded',
        },
      ],
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'security',
    })

    expect(updated.journalEntries.at(-1)).toMatchObject({ title: 'Contradição em revisão' })
  })

  it('abre rotas documentais alternativas com Cartão de Contato, Caixa de Arquivo e Selo', () => {
    const contact = prepareCard('isadora', 'contact-card', { round: 2, locationId: 'security' })
    const externalSource = contact.service.resolveAction({
      matchId: contact.match.id,
      action: 'research',
      locationId: 'security',
    })
    expect(externalSource.resolvedKeys).toContain('e2-confirmed')

    const archive = prepareCard('otavio', 'archive-box', { round: 2, locationId: 'security' })
    const archived = archive.service.resolveAction({
      matchId: archive.match.id,
      action: 'research',
      locationId: 'security',
    })
    expect(archived.resolvedKeys).toContain('security-log-gap')

    const seal = prepareCard('otavio', 'institutional-seal', { round: 2, locationId: 'security' })
    const opened = seal.service.resolveAction({
      matchId: seal.match.id,
      action: 'research',
      locationId: 'security',
    })
    expect(opened.resolvedKeys).toContain('security-log-gap')
  })

  it('organiza a cronologia com o Fio Cronológico', () => {
    const { service, match } = prepareCard('otavio', 'chronological-thread', {
      locationId: 'security',
      journalEntries: [
        clue('log-gap', 'Lacuna no terminal', 'security', 'confirmed', 'Exclusão às 22h13.'),
        clue(
          'blackout',
          'Relatório do apagão',
          'security',
          'confirmed',
          'Queda às 22h14 e retorno às 22h21.',
        ),
      ],
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'research',
      locationId: 'security',
    })

    expect(updated.journalEntries.at(-1)).toMatchObject({ title: 'Sequência temporal organizada' })
  })

  it('aplica a Lanterna Ultravioleta contextualmente fora da galeria', () => {
    const { service, match } = prepareCard('livia', 'ultraviolet-flashlight', {
      locationId: 'office',
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'examine',
      locationId: 'office',
    })

    expect(updated.journalEntries.at(-1)).toMatchObject({
      title: 'Varredura ultravioleta',
      type: 'observation',
      locationId: 'office',
    })
  })

  it('permite usar recursos documentais antes das rodadas tradicionalmente exigidas', () => {
    const { service, match } = prepareCard('isadora', 'contact-card', {
      round: 1,
      locationId: 'security',
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'research',
      locationId: 'security',
    })

    expect(updated.resolvedKeys).toContain('e2-confirmed')
    expect(updated.journalEntries.at(-1)?.status).toBe('confirmed')
  })

  it('não inclui local ou rodada em mensagens de validação de cartas', () => {
    const { service, match } = prepareCard('isadora', 'contact-card', { locationId: 'office' })

    expect(() =>
      service.resolveAction({ matchId: match.id, action: 'research', locationId: 'office' }),
    ).not.toThrow(/Rodada|exige Pesquisar a Sala/)
  })
})
