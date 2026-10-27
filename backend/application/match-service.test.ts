import { describe, expect, it } from 'vitest'
import { MatchService } from './match-service.js'
import { InMemoryMatchRepository } from '../infrastructure/persistence/in-memory-match-repository.js'
import type { InvestigatorId } from '../domain/match.js'
import type { MatchCard } from '../domain/match-deck.js'

describe('MatchService', () => {
  it('sinaliza uma abordagem plausível e orienta após uma tentativa sem descoberta', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    expect(service.getActionOpportunities(match.id).examine.status).toBe('promising')
    expect(service.getActionOpportunities(match.id).analyse.status).toBe('exploratory')

    const attempted = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'gallery',
    })
    const observation = attempted.journalEntries.at(-1)
    expect(observation).toMatchObject({
      type: 'observation',
      actionAttempt: 'analyse',
    })
    expect(observation?.content).toContain('tente um método diferente')
    expect(service.getActionOpportunities(match.id).analyse.status).toBe('exhausted')
  })

  it('cria uma partida solo com dupla fixa e estado inicial', () => {
    const service = new MatchService(
      new InMemoryMatchRepository(),
      () => new Date('2026-10-21T12:00:00.000Z'),
      () => 'match-1',
    )

    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    expect(match).toMatchObject({
      id: 'match-1',
      mode: 'solo',
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
      round: 1,
      status: 'active',
    })
    expect(service.getMatch(match.id)).toEqual(match)
    expect(match.decks.livia.hand).toHaveLength(4)
    expect(match.decks.rafael.hand).toHaveLength(4)
  })

  it('rejeita a mesma pessoa como ativa e apoio', () => {
    const service = new MatchService(new InMemoryMatchRepository())

    expect(() =>
      service.createSoloMatch({ activeInvestigatorId: 'livia', supportInvestigatorId: 'livia' }),
    ).toThrow('O investigador ativo e o apoio precisam ser diferentes.')
  })

  it('rejeita ações e conversas fora do local atual ou em locais bloqueados', () => {
    const service = new MatchService(new InMemoryMatchRepository())
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    expect(() =>
      service.resolveAction({ matchId: match.id, action: 'research', locationId: 'security' }),
    ).toThrow('O investigador precisa estar no local escolhido para agir.')
    expect(() => service.getConversationOptions(match.id, 'helena', 'office')).toThrow(
      'O investigador precisa estar no local escolhido para agir.',
    )
  })

  it('rejeita ações no local atual quando ele ainda não foi liberado', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({ ...match, currentLocationId: 'service-corridor' })

    expect(() =>
      service.resolveAction({
        matchId: match.id,
        action: 'examine',
        locationId: 'service-corridor',
      }),
    ).toThrow('Este local ainda não foi liberado.')
  })

  it('mantém quatro cartas regulares e todas as temporárias ao descartar', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const deck = match.decks.livia
    const temporaryCard: MatchCard = {
      instanceId: 'temporary:guest-list:livia',
      definitionId: 'guest-list',
      ownerId: 'livia',
      cost: 1,
      compatibleActions: ['research'],
      temporary: true,
    }
    repository.save({
      ...match,
      decks: { ...match.decks, livia: { ...deck, hand: [...deck.hand, temporaryCard] } },
    })

    const updated = service.discardCard(match.id, deck.hand[0]!.instanceId)

    expect(updated.decks.livia.hand.filter((card) => !card.temporary)).toHaveLength(4)
    expect(updated.decks.livia.hand).toContainEqual(temporaryCard)
  })

  it('consome o marcador quando a pista local é confirmada e aplica o desconto na análise', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'rafael',
      supportInvestigatorId: 'livia',
    })
    repository.save({
      ...match,
      resolvedKeys: ['gallery-lock'],
      journalEntries: [
        {
          id: 'marked-clue',
          type: 'clue',
          title: 'Vestígio marcado',
          content: 'Pista física pendente.',
          locationId: 'gallery',
          round: 1,
          status: 'unconfirmed',
          markedForFollowUp: true,
        },
      ],
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'gallery',
    })

    expect(updated.actionPoints).toMatchObject({ general: 4, specialty: 0 })
    expect(updated.journalEntries.find((entry) => entry.id === 'marked-clue')).toMatchObject({
      markedForFollowUp: false,
    })
  })

  it('registra uma ligação visual sem gastar PA nem consumir a carta preparada', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const activeDeck = match.decks.livia
    const supportDeck = match.decks.rafael
    const supportCard = [...supportDeck.hand, ...supportDeck.drawPile].find(
      (card) => card.definitionId === 'comparative-magnifier',
    )
    if (!supportCard) throw new Error('O baralho do apoio precisa conter a Lupa Comparativa.')
    const heldSupportCard = { ...supportCard, cost: 0 as const }
    repository.save({
      ...match,
      journalEntries: [
        {
          id: 'connection-first',
          type: 'clue',
          title: 'Primeira pista',
          content: 'Registro inicial.',
          locationId: 'gallery',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['means'],
          hypothesisThreadIds: ['route'],
        },
        {
          id: 'connection-second',
          type: 'clue',
          title: 'Segunda evidência',
          content: 'Registro confirmado.',
          locationId: 'laboratory',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['opportunity'],
          hypothesisThreadIds: ['route'],
        },
      ],
      hypotheses: [
        {
          id: 'route',
          status: 'inquiry',
          evidence: [
            { entryId: 'connection-first', axis: 'means' },
            { entryId: 'connection-second', axis: 'opportunity' },
          ],
          coherentRelationIds: [],
          hasOperationalInconsistency: false,
        },
      ],
      decks: {
        ...match.decks,
        livia: { ...activeDeck, hand: [...activeDeck.hand, heldSupportCard] },
        rafael: {
          ...supportDeck,
          hand: supportDeck.hand.filter((card) => card.instanceId !== supportCard.instanceId),
          drawPile: supportDeck.drawPile.filter(
            (card) => card.instanceId !== supportCard.instanceId,
          ),
        },
      },
    })
    service.prepareCard(match.id, heldSupportCard.instanceId)

    const linked = service.createMuralLink({
      matchId: match.id,
      fromClueId: 'connection-first',
      toClueId: 'connection-second',
    })

    expect(linked.decks.livia.hand).toContainEqual(heldSupportCard)
    expect(linked.decks.rafael.discardPile).not.toContainEqual(heldSupportCard)
    expect(linked.preparedCardInstanceId).toBe(heldSupportCard.instanceId)
    expect(linked.actionPoints).toEqual(match.actionPoints)
    expect(linked.investigativeRelations).toHaveLength(0)
    expect(linked.hypotheses).toMatchObject([{ status: 'inquiry', coherentRelationIds: [] }])
  })

  it('aciona o apoio uma vez por rodada e retém cartas extras sem uso', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const supportDeck = match.decks.rafael
    const supportCard = [...supportDeck.hand, ...supportDeck.drawPile].find(
      (card) => card.definitionId === 'comparative-magnifier',
    )
    if (!supportCard) throw new Error('O baralho do apoio precisa conter a Lupa Comparativa.')
    repository.save({
      ...match,
      decks: {
        ...match.decks,
        rafael: { drawPile: [supportCard], discardPile: [], hand: [] },
      },
    })

    const requested = service.requestSupportCard(match.id)
    const receivedCard = requested.decks.livia.hand.find(
      (card) => card.instanceId === supportCard.instanceId,
    )
    expect(requested.hasUsedSupportThisRound).toBe(true)
    expect(receivedCard).toMatchObject({ cost: 0, originalCost: 1, ownerId: 'rafael' })
    expect(() => service.requestSupportCard(match.id)).toThrow(
      'O apoio já foi acionado nesta rodada.',
    )

    const nextRound = service.endTurn(match.id)
    expect(nextRound.hasUsedSupportThisRound).toBe(false)
    expect(
      nextRound.decks.livia.hand.filter((card) => !card.temporary && card.ownerId === 'livia'),
    ).toHaveLength(4)
    expect(nextRound.decks.livia.hand).toContainEqual(receivedCard)
    expect(nextRound.decks.rafael.drawPile).toHaveLength(0)
    const regularCard = nextRound.decks.livia.hand.find((card) => card.ownerId === 'livia')!
    const afterDiscard = service.discardCard(match.id, regularCard.instanceId)
    expect(afterDiscard.decks.livia.hand.filter((card) => card.ownerId === 'livia')).toHaveLength(4)
    expect(afterDiscard.decks.livia.hand).toContainEqual(receivedCard)
  })

  it('permite desenhar a ligação no mural sem consumir o benefício de Isadora', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'livia',
    })
    repository.save({
      ...match,
      actionPoints: { general: 0, specialty: 0, specialtyPoint: 'social' },
      hasSocialConnectionThisRound: true,
      journalEntries: [
        {
          id: 'means',
          type: 'clue',
          title: 'Meios',
          content: 'Confirmada.',
          locationId: 'gallery',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['means'],
          hypothesisThreadIds: ['route'],
        },
        {
          id: 'opportunity',
          type: 'clue',
          title: 'Oportunidade',
          content: 'Confirmada.',
          locationId: 'security',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['opportunity'],
          hypothesisThreadIds: ['route'],
        },
      ],
    })

    const connected = service.createMuralLink({
      matchId: match.id,
      fromClueId: 'means',
      toClueId: 'opportunity',
    })

    expect(connected.actionPoints.general).toBe(0)
    expect(connected.hasUsedSocialConnectionThisRound).toBe(false)
    expect(connected.muralLinks).toHaveLength(1)
    expect(connected.investigativeRelations).toHaveLength(0)
  })

  it('cobra o cruzamento investigativo e registra uma relação validada no diário', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'relation-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({
      ...match,
      actionPoints: { general: 1, specialty: 0, specialtyPoint: null },
      journalEntries: [
        {
          id: 'means',
          type: 'clue',
          title: 'Acesso confirmado',
          content: 'Registro validado.',
          locationId: 'gallery',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['means'],
          hypothesisThreadIds: ['route'],
        },
        {
          id: 'opportunity',
          type: 'clue',
          title: 'Horário confirmado',
          content: 'Registro validado.',
          locationId: 'security',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['opportunity'],
          hypothesisThreadIds: ['route'],
        },
      ],
    })

    const crossed = service.createInvestigativeCrossing({
      matchId: match.id,
      fromClueId: 'means',
      toClueId: 'opportunity',
    })

    expect(crossed.actionPoints.general).toBe(0)
    expect(crossed.investigativeRelations).toContainEqual(
      expect.objectContaining({
        fromClueId: 'means',
        toClueId: 'opportunity',
        hypothesisThreadId: 'route',
      }),
    )
    expect(crossed.hypotheses).toMatchObject([{ id: 'route', status: 'plausible' }])
    expect(crossed.journalEntries.at(-1)).toMatchObject({
      title: 'Relação investigativa validada',
      relatedEntryIds: ['means', 'opportunity'],
    })
  })

  it('aplica o benefício social ao cruzamento e o marca como usado', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'livia',
    })
    repository.save({
      ...match,
      actionPoints: { general: 0, specialty: 0, specialtyPoint: 'social' },
      hasSocialConnectionThisRound: true,
      journalEntries: [
        {
          id: 'means',
          type: 'clue',
          title: 'Meios',
          content: 'Confirmada.',
          locationId: 'gallery',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['means'],
          hypothesisThreadIds: ['route'],
        },
        {
          id: 'opportunity',
          type: 'clue',
          title: 'Oportunidade',
          content: 'Confirmada.',
          locationId: 'security',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['opportunity'],
          hypothesisThreadIds: ['route'],
        },
      ],
    })

    const crossed = service.createInvestigativeCrossing({
      matchId: match.id,
      fromClueId: 'means',
      toClueId: 'opportunity',
    })

    expect(crossed.actionPoints.general).toBe(0)
    expect(crossed.hasUsedSocialConnectionThisRound).toBe(true)
  })

  it('restaura o custo original da carta do apoio ao cruzar evidências', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository)
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const supportCard = [...match.decks.rafael.hand, ...match.decks.rafael.drawPile].find(
      (card) => card.definitionId === 'comparative-magnifier',
    )
    if (!supportCard) throw new Error('O baralho do apoio precisa conter a Lupa Comparativa.')
    repository.save({
      ...match,
      journalEntries: [
        {
          id: 'support-clue-confirmed',
          type: 'clue',
          title: 'Pista confirmada',
          content: 'Registro confirmado.',
          locationId: 'gallery',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['means'],
          hypothesisThreadIds: ['route'],
        },
        {
          id: 'support-clue-pending',
          type: 'clue',
          title: 'Segunda evidência',
          content: 'Registro confirmado.',
          locationId: 'laboratory',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['opportunity'],
          hypothesisThreadIds: ['route'],
        },
      ],
      decks: {
        ...match.decks,
        rafael: { drawPile: [supportCard], discardPile: [], hand: [] },
      },
    })

    const requested = service.requestSupportCard(match.id)
    const receivedCard = requested.decks.livia.hand.find(
      (card) => card.instanceId === supportCard.instanceId,
    )
    if (!receivedCard) throw new Error('A carta solicitada precisa estar na mão ativa.')
    service.prepareCard(match.id, receivedCard.instanceId)

    const connected = service.createInvestigativeCrossing({
      matchId: match.id,
      fromClueId: 'support-clue-confirmed',
      toClueId: 'support-clue-pending',
    })
    const recycled = connected.decks.rafael.discardPile.find(
      (card) => card.instanceId === supportCard.instanceId,
    )

    expect(recycled).toMatchObject({ cost: 1, ownerId: 'rafael' })
    expect(recycled).not.toHaveProperty('originalCost')
  })

  it('cobra PA apenas após o primeiro deslocamento da rodada e bloqueia locais não liberados', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'move-match')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    const firstMove = service.moveInvestigator(match.id, 'security')
    expect(firstMove.actionPoints.general).toBe(5)
    expect(firstMove.hasUsedFreeMoveThisRound).toBe(true)

    const secondMove = service.moveInvestigator(match.id, 'office')
    expect(secondMove.actionPoints.general).toBe(4)
    expect(() => service.moveInvestigator(match.id, 'service-corridor')).toThrow(
      'Este local ainda não foi liberado.',
    )

    const nextRound = service.endTurn(match.id)
    expect(nextRound.hasUsedFreeMoveThisRound).toBe(false)
    expect(service.moveInvestigator(match.id, 'gallery').actionPoints.general).toBe(5)
  })

  it('libera o Corredor de Serviço após examinar a porta na Rodada 3', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'corridor-match')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({
      ...match,
      round: 3,
      resolvedKeys: ['gallery-lock', 'gallery-pedestal'],
    })

    const opened = service.resolveAction({
      matchId: match.id,
      locationId: 'gallery',
      action: 'examine',
    })
    expect(opened.unlockedLocations).toContain('service-corridor')
    expect(service.moveInvestigator(match.id, 'service-corridor').currentLocationId).toBe(
      'service-corridor',
    )
  })

  it('resolve descobertas da galeria e registra uma observação quando não há novidade', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    service.createSoloMatch({ activeInvestigatorId: 'livia', supportInvestigatorId: 'rafael' })

    const first = service.resolveAction({
      matchId: 'match-1',
      locationId: 'gallery',
      action: 'examine',
    })
    const second = service.resolveAction({
      matchId: 'match-1',
      locationId: 'gallery',
      action: 'examine',
    })
    service.endTurn('match-1')
    const third = service.resolveAction({
      matchId: 'match-1',
      locationId: 'gallery',
      action: 'examine',
    })

    expect(first.journalEntries[0]).toMatchObject({
      type: 'clue',
      title: 'Fechadura de emergência da vitrine',
    })
    expect(second.journalEntries.at(-1)).toMatchObject({
      type: 'clue',
      title: 'Vestígio no pedestal',
    })
    expect(third.journalEntries.at(-1)).toMatchObject({
      type: 'observation',
      title: 'Sem nova descoberta: Galeria Principal',
    })
    expect(third.notificationEvents?.map((event) => event.kind)).toContain('action-failure')
    expect(third.actionPoints.general).toBe(4)
  })

  it('registra o detalhe extra do Perímetro preservado no primeiro exame da Galeria', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'round-one')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    const firstExamine = service.resolveAction({
      matchId: match.id,
      action: 'examine',
      locationId: 'gallery',
    })
    expect(firstExamine.journalEntries.at(-1)).toMatchObject({
      type: 'observation',
      title: 'Detalhe do perímetro preservado',
      round: 1,
    })

    const secondExamine = service.resolveAction({
      matchId: match.id,
      action: 'examine',
      locationId: 'gallery',
    })
    expect(
      secondExamine.journalEntries.filter((entry) =>
        entry.title.includes('Detalhe do perímetro preservado'),
      ),
    ).toHaveLength(1)
  })

  it('aplica o custo do Vazamento para a imprensa somente à primeira conversa com Helena ou Davi', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'press-leak')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({ ...match, round: 2 })

    setCurrentLocation(repository, match.id, 'office')
    const helenaOptions = service.getConversationOptions(match.id, 'helena', 'office')
    expect(
      helenaOptions.questions.find((question) => question.id === 'marta-disagreement'),
    ).toMatchObject({
      cost: 2,
      canResolve: true,
    })
    const afterHelena = service.resolveConversation({
      matchId: match.id,
      personId: 'helena',
      locationId: 'office',
      questionId: 'marta-disagreement',
    })
    expect(afterHelena.actionPoints.general).toBe(3)
    expect(afterHelena.hasUsedPressLeakConversationThisRound).toBe(true)

    setCurrentLocation(repository, match.id, 'gallery')
    const afterGalleryTravel = repository.findById(match.id)!
    repository.save({
      ...afterGalleryTravel,
      resolvedKeys: [...afterGalleryTravel.resolvedKeys, 'security-log-gap'],
    })
    const daviOptions = service.getConversationOptions(match.id, 'davi', 'gallery')
    expect(daviOptions.questions.find((question) => question.id === 'collectors')).toMatchObject({
      cost: 2,
      canResolve: true,
    })
    expect(service.endTurn(match.id).hasUsedPressLeakConversationThisRound).toBe(false)
  })

  it('uma carta social compatível evita o adicional do Vazamento para a imprensa', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'press-card')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'rafael',
    })
    const pause = putCardInHand(repository, match, 'calculated-pause')
    repository.save({ ...repository.findById(match.id)!, round: 2 })
    service.prepareCard(match.id, pause.instanceId)

    setCurrentLocation(repository, match.id, 'office')
    const options = service.getConversationOptions(match.id, 'helena', 'office')
    expect(
      options.questions.find((question) => question.id === 'marta-disagreement'),
    ).toMatchObject({
      cost: 1,
      canResolve: true,
    })
  })

  it('registra o evento da Rodada 3 e mantém a conexão gratuita nas rodadas previstas', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'round-events')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({ ...match, round: 2 })

    const roundThree = service.endTurn(match.id)
    expect(roundThree.journalEntries.at(-1)).toMatchObject({
      type: 'observation',
      title: 'Comunicado da manutenção municipal',
      round: 3,
    })
    expect(roundThree.notificationEvents?.map((event) => event.kind)).toContain('round-event')

    repository.save({ ...roundThree, round: 4 })
    const roundFive = service.endTurn(match.id)
    expect(roundFive).toMatchObject({
      round: 5,
      hasFreeConnectionThisRound: true,
      hasUsedFreeConnectionThisRound: false,
    })

    const roundSix = service.endTurn(match.id)
    expect(roundSix).toMatchObject({
      round: 6,
      hasFreeConnectionThisRound: false,
      hasUsedFreeConnectionThisRound: false,
    })
  })

  it('impede novas pistas de exploração básica na Rodada 6 e ainda permite análise', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'final-deadline')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    repository.save({ ...match, round: 6 })

    expect(() =>
      service.resolveAction({
        matchId: match.id,
        action: 'examine',
        locationId: 'gallery',
      }),
    ).toThrow('O prazo final impede novas descobertas por exploração.')
    expect(service.getMatch(match.id)).toEqual({ ...match, round: 6 })

    repository.save({ ...match, round: 6, resolvedKeys: ['gallery-lock'] })
    const analysis = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'gallery',
    })
    expect(analysis.journalEntries.at(-1)).toMatchObject({ status: 'confirmed' })
  })

  it('permite organizar uma conexão na Rodada 6 sem revelar uma pista inédita', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'final-connection')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'otavio',
      supportInvestigatorId: 'livia',
    })
    repository.save({
      ...match,
      round: 6,
      currentLocationId: 'security',
      journalEntries: [
        {
          id: 'confirmed-clue',
          type: 'clue',
          title: 'Registro confirmado',
          content: 'Evidência validada.',
          locationId: 'security',
          round: 2,
          status: 'confirmed',
          evidenceAxes: ['means'],
          hypothesisThreadIds: ['route'],
        },
        {
          id: 'pending-clue',
          type: 'clue',
          title: 'Oportunidade confirmada',
          content: 'Evidência validada.',
          locationId: 'gallery',
          round: 2,
          status: 'confirmed',
          evidenceAxes: ['opportunity'],
          hypothesisThreadIds: ['route'],
        },
      ],
    })

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'research',
      locationId: 'security',
    })

    expect(updated.resolvedKeys).not.toContain('security-initial-report')
    expect(updated.journalEntries.at(-1)).toMatchObject({
      title: 'Cruzamento investigativo de Otávio',
      relatedEntryIds: ['confirmed-clue', 'pending-clue'],
    })
  })

  it('mantém descobertas disponíveis nas rodadas seguintes e libera análise com pré-requisitos', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'security')
    service.resolveAction({ matchId: match.id, locationId: 'security', action: 'research' })
    service.endTurn(match.id)
    const gap = service.resolveAction({
      matchId: match.id,
      locationId: 'security',
      action: 'research',
    })
    expect(gap.journalEntries.at(-1)).toMatchObject({ title: 'Lacuna no terminal' })

    service.endTurn(match.id)
    const technical = service.resolveAction({
      matchId: match.id,
      locationId: 'security',
      action: 'analyse',
    })
    expect(technical.journalEntries.at(-1)).toMatchObject({
      title: 'Acionamento manual confirmado',
      status: 'confirmed',
    })
    expect(technical.resolvedKeys).toContain('security-log-gap')
  })

  it('descarta uma carta preparada e recompõe a mão imediatamente uma vez por rodada', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const discardedCard = match.decks.livia.hand[0]
    if (!discardedCard) throw new Error('A mão inicial precisa conter cartas para este cenário.')
    const updated = service.discardCard(match.id, discardedCard.instanceId)

    expect(updated.round).toBe(1)
    expect(updated.decks.livia.hand).toHaveLength(4)
    expect(updated.decks.livia.discardPile).toContainEqual(discardedCard)
    expect(() => service.discardCard(match.id, discardedCard.instanceId)).toThrow(
      'Apenas uma carta pode ser descartada por rodada.',
    )
    expect(
      new Set(
        [
          ...updated.decks.livia.hand,
          ...updated.decks.livia.drawPile,
          ...updated.decks.livia.discardPile,
        ].map((card) => card.instanceId),
      ),
    ).toHaveLength(8)
  })

  it('envia a carta descartada ao descarte do dono e remove cartas temporárias da partida', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const supportCard = match.decks.rafael.hand[0]
    if (!supportCard) throw new Error('A mão de apoio precisa conter cartas para este cenário.')
    repository.save({
      ...match,
      decks: {
        ...match.decks,
        livia: { ...match.decks.livia, hand: [supportCard, ...match.decks.livia.hand.slice(1)] },
      },
    })

    const discardedSupportCard = service.discardCard(match.id, supportCard.instanceId)
    expect(discardedSupportCard.decks.rafael.discardPile).toContainEqual(supportCard)
    expect(discardedSupportCard.decks.livia.discardPile).not.toContainEqual(supportCard)

    const nextMatch = service.endTurn(match.id)
    const temporaryCard = {
      ...nextMatch.decks.livia.hand[0]!,
      instanceId: 'temporary:curator-agenda:livia',
      temporary: true,
    }
    repository.save({
      ...nextMatch,
      decks: {
        ...nextMatch.decks,
        livia: {
          ...nextMatch.decks.livia,
          hand: [temporaryCard, ...nextMatch.decks.livia.hand.slice(1)],
        },
      },
    })

    const discardedTemporaryCard = service.discardCard(match.id, temporaryCard.instanceId)
    expect(discardedTemporaryCard.decks.livia.discardPile).not.toContainEqual(temporaryCard)
    expect(discardedTemporaryCard.decks.livia.hand).not.toContainEqual(temporaryCard)
  })

  it('valida a carta preparada e a move para o descarte após uma ação compatível', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const card = [...match.decks.livia.hand, ...match.decks.livia.drawPile].find(
      (candidate) => candidate.definitionId === 'ultraviolet-flashlight',
    )
    if (!card) throw new Error('A Lanterna Ultravioleta precisa estar no baralho inicial.')
    if (!match.decks.livia.hand.some((handCard) => handCard.instanceId === card.instanceId)) {
      const updatedDeck = {
        ...match.decks.livia,
        hand: [...match.decks.livia.hand, card],
        drawPile: match.decks.livia.drawPile.filter(
          (drawCard) => drawCard.instanceId !== card.instanceId,
        ),
      }
      repository.save({
        ...match,
        decks: { ...match.decks, livia: updatedDeck },
      })
    }
    service.prepareCard(match.id, card.instanceId)

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'examine',
      locationId: 'gallery',
    })

    expect(updated.decks.livia.hand).not.toContainEqual(card)
    expect(updated.decks.livia.discardPile).toContainEqual(card)
    expect(updated.actionPoints.general).toBe(5 - 1 - card.cost)
  })

  it('embaralha as cartas regulares e preserva temporárias acima de quatro cartas', () => {
    const repository = new InMemoryMatchRepository()
    const seededService = new MatchService(repository, undefined, () => 'seeded-match')
    const seededMatch = seededService.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const temporaryCard = {
      ...seededMatch.decks.livia.hand[0]!,
      instanceId: 'temporary:extra:livia',
      temporary: true,
    }
    repository.save({
      ...seededMatch,
      decks: {
        ...seededMatch.decks,
        livia: {
          ...seededMatch.decks.livia,
          hand: [...seededMatch.decks.livia.hand, temporaryCard],
        },
      },
    })
    const changed = seededService.endTurn(seededMatch.id)

    expect(changed.decks.livia.hand).toHaveLength(5)
    expect(changed.decks.livia.hand.filter((card) => !card.temporary)).toHaveLength(4)
    expect(changed.decks.livia.hand).toContainEqual(temporaryCard)
    expect(changed.decks.rafael.hand).toEqual(seededMatch.decks.rafael.hand)
  })

  it('limpa a carta preparada quando ela é descartada', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const card = match.decks.livia.hand[0]!
    service.prepareCard(match.id, card.instanceId)

    const discarded = service.discardCard(match.id, card.instanceId)

    expect(discarded.preparedCardInstanceId).toBeNull()
  })

  it('oferece perguntas da pessoa presente e registra a declaração ao resolvê-la', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'laboratory')

    const options = service.getConversationOptions('match-1', 'marta', 'laboratory')
    const updated = service.resolveConversation({
      matchId: 'match-1',
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'technical-assessment',
    })

    expect(options.questions).toHaveLength(3)
    expect(options.questions[0]).toMatchObject({
      cost: 2,
      approach: 'inquiry',
      canResolve: true,
    })
    expect(updated.actionPoints).toMatchObject({ general: 3, specialty: 0 })
    expect(updated.journalEntries.at(-1)).toMatchObject({
      type: 'statement',
      title: 'Declaração de Marta Lobo',
      locationId: 'laboratory',
    })
    const remainingOptions = service.getConversationOptions('match-1', 'marta', 'laboratory')
    expect(remainingOptions.questions).toHaveLength(2)
    expect(remainingOptions.questions.some((question) => question.canResolve)).toBe(true)
    expect(remainingOptions).not.toHaveProperty('questionLimitReached')
  })

  it('mantém perguntas dependentes de evidência visíveis, mas bloqueadas sem consumir o turno', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    setCurrentLocation(repository, match.id, 'laboratory')
    const options = service.getConversationOptions(match.id, 'marta', 'laboratory')
    const fingerprints = options.questions.find((question) => question.id === 'fingerprints')
    expect(fingerprints).toMatchObject({
      canResolve: false,
      isEvidenceBlocked: true,
    })
    expect(fingerprints).not.toHaveProperty('blockedReason')
    expect(() =>
      service.resolveConversation({
        matchId: match.id,
        personId: 'marta',
        locationId: 'laboratory',
        questionId: 'fingerprints',
      }),
    ).toThrow('Diálogo bloqueado: evidência necessária')
    expect(service.getMatch(match.id)).toMatchObject({
      currentLocationId: 'laboratory',
      actionPoints: match.actionPoints,
      journalEntries: match.journalEntries,
    })
  })

  it('bloqueia pergunta por falta de evidência e a libera após o registro correspondente', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'security')
    const options = service.getConversationOptions(match.id, 'raul', 'security')
    expect(options.questions.find((question) => question.id === 'power-failure')).toMatchObject({
      canResolve: false,
      isEvidenceBlocked: true,
    })

    let matchAtLaterRound = repository.findById(match.id)!
    for (let turn = 0; turn < 5; turn++) {
      matchAtLaterRound = service.endTurn(match.id)
    }

    expect(matchAtLaterRound.round).toBe(6)
    expect(
      service
        .getConversationOptions(match.id, 'raul', 'security')
        .questions.find((question) => question.id === 'power-failure'),
    ).toMatchObject({ canResolve: false, isEvidenceBlocked: true })

    repository.save({
      ...matchAtLaterRound,
      resolvedKeys: [...matchAtLaterRound.resolvedKeys, 'security-initial-report'],
    })
    expect(
      service
        .getConversationOptions(match.id, 'raul', 'security')
        .questions.find((question) => question.id === 'power-failure'),
    ).toMatchObject({ canResolve: true, isEvidenceBlocked: false })
  })

  it('libera as perguntas de Davi e Raul pela lacuna registrada, sem depender da rodada', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'gallery')
    repository.save({ ...repository.findById(match.id)!, round: 1 })

    expect(
      service
        .getConversationOptions(match.id, 'davi', 'gallery')
        .questions.find((question) => question.id === 'collectors'),
    ).toMatchObject({ canResolve: false, isEvidenceBlocked: true })

    const evidenceFound = repository.findById(match.id)!
    repository.save({
      ...evidenceFound,
      resolvedKeys: [...evidenceFound.resolvedKeys, 'security-log-gap'],
    })
    expect(
      service
        .getConversationOptions(match.id, 'davi', 'gallery')
        .questions.find((question) => question.id === 'collectors'),
    ).toMatchObject({ canResolve: true, isEvidenceBlocked: false })

    setCurrentLocation(repository, match.id, 'security')
    expect(
      service
        .getConversationOptions(match.id, 'raul', 'security')
        .questions.find((question) => question.id === 'security-procedure'),
    ).toMatchObject({ canResolve: true, isEvidenceBlocked: false })
  })

  it('permite várias perguntas distintas no mesmo turno e mantém cada uma como uso único', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'laboratory')

    const firstAnswer = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'davi-interest',
    })
    const secondAnswer = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'technical-assessment',
    })
    expect(secondAnswer.journalEntries).toHaveLength(firstAnswer.journalEntries.length + 1)
    expect(() =>
      service.resolveConversation({
        matchId: match.id,
        personId: 'marta',
        locationId: 'laboratory',
        questionId: 'technical-assessment',
      }),
    ).toThrow('Esta pergunta já foi resolvida.')
  })

  it('rejeita conversa fora do local, pergunta inexistente ou já resolvida sem alterar a partida', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    expect(() => service.getConversationOptions(match.id, 'marta', 'gallery')).toThrow(
      'Esta pessoa não está disponível neste local.',
    )
    setCurrentLocation(repository, match.id, 'laboratory')
    expect(() =>
      service.resolveConversation({
        matchId: match.id,
        personId: 'marta',
        locationId: 'laboratory',
        questionId: 'not-found',
      }),
    ).toThrow('Pergunta inexistente para esta conversa.')
    const resolved = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'davi-interest',
    })
    expect(() =>
      service.resolveConversation({
        matchId: match.id,
        personId: 'marta',
        locationId: 'laboratory',
        questionId: 'davi-interest',
      }),
    ).toThrow('Esta pergunta já foi resolvida.')
    expect(service.getMatch(match.id)).toEqual(resolved)
  })

  it('libera a pressão de Marta somente depois da evidência da Galeria', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'laboratory')

    expect(() =>
      service.resolveConversation({
        matchId: match.id,
        personId: 'marta',
        locationId: 'laboratory',
        questionId: 'fingerprints',
      }),
    ).toThrow('Diálogo bloqueado: evidência necessária')

    const corroboratedRepository = new InMemoryMatchRepository()
    const corroboratedService = new MatchService(corroboratedRepository, undefined, () => 'match-2')
    const corroboratedMatch = corroboratedService.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const afterGallery = corroboratedService.resolveAction({
      matchId: corroboratedMatch.id,
      action: 'examine',
      locationId: 'gallery',
    })
    setCurrentLocation(corroboratedRepository, corroboratedMatch.id, 'laboratory')
    const recorded = corroboratedService.resolveConversation({
      matchId: corroboratedMatch.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'technical-assessment',
    })
    expect(afterGallery.resolvedKeys).toContain('gallery-lock')
    expect(recorded.journalEntries.at(-1)).toMatchObject({ status: 'recorded' })
  })

  it('aplica Gravador de Bolso à declaração e descarta a carta preparada', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'laboratory')
    const recorder = putCardInHand(repository, match, 'pocket-recorder')
    service.prepareCard(match.id, recorder.instanceId)

    const updated = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'davi-interest',
    })

    expect(updated.journalEntries.at(-1)).toMatchObject({ recordedWith: 'pocket-recorder' })
    expect(updated.decks.isadora.discardPile).toContainEqual(recorder)
    expect(updated.preparedCardInstanceId).toBeNull()
  })

  it('inclui o custo da carta preparada ao bloquear perguntas sem PA suficientes', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'laboratory')
    const recorder = putCardInHand(repository, match, 'pocket-recorder')
    const updatedMatch = repository.findById(match.id)
    if (!updatedMatch) throw new Error('A partida precisa permanecer persistida.')
    repository.save({
      ...updatedMatch,
      actionPoints: { general: 2, specialty: 0, specialtyPoint: 'social' },
    })
    service.prepareCard(match.id, recorder.instanceId)

    const options = service.getConversationOptions(match.id, 'marta', 'laboratory')

    expect(options.questions[0]).toMatchObject({ canResolve: false, cost: 3 })

    const [question] = options.questions
    if (!question) throw new Error('A pergunta precisa estar disponível para inspeção.')
    const matchWithEnoughPoints = repository.findById(match.id)
    if (!matchWithEnoughPoints) throw new Error('A partida precisa permanecer persistida.')
    repository.save({
      ...matchWithEnoughPoints,
      actionPoints: { general: 3, specialty: 0, specialtyPoint: 'social' },
    })

    const payableOptions = service.getConversationOptions(match.id, 'marta', 'laboratory')
    expect(payableOptions.questions[0]).toMatchObject({ canResolve: true, cost: 3 })

    const updated = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: question.id,
    })
    expect(updated.actionPoints.general).toBe(0)
  })

  it('usa Pausa Calculada para liberar uma pergunta adicional gratuita', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'laboratory')
    const pause = putCardInHand(repository, match, 'calculated-pause')
    service.prepareCard(match.id, pause.instanceId)

    service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'davi-interest',
    })
    const options = service.getConversationOptions(match.id, 'marta', 'laboratory')
    expect(options.questions.map((question) => question.cost)).toEqual([0, 0])

    const updated = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'technical-assessment',
    })
    expect(updated.actionPoints.general).toBe(4)
  })

  it('aceita preparar Pausa Calculada após a primeira pergunta do turno', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'laboratory')
    const afterFirstQuestion = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'davi-interest',
    })
    const pause = putCardInHand(repository, afterFirstQuestion, 'calculated-pause')
    service.prepareCard(match.id, pause.instanceId)

    const options = service.getConversationOptions(match.id, 'marta', 'laboratory')
    expect(options.questions.map((question) => question.cost)).toEqual([0, 0])

    const updated = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'technical-assessment',
    })
    expect(updated.actionPoints.general).toBe(4)
    expect(updated.decks.isadora.discardPile).toContainEqual(pause)
  })

  it('concede uma carta temporária após uma conversa que cumpre sua condição', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    setCurrentLocation(repository, match.id, 'office')

    const updated = service.resolveConversation({
      matchId: match.id,
      personId: 'helena',
      locationId: 'office',
      questionId: 'insurance-review',
    })

    expect(updated.decks.livia.hand).toContainEqual(
      expect.objectContaining({ definitionId: 'curator-agenda', temporary: true }),
    )
    expect(updated.decks.livia.hand).toHaveLength(5)
  })

  it('concede as cartas temporárias de Davi e Raul quando suas conversas são liberadas', () => {
    const daviRepository = new InMemoryMatchRepository()
    const daviService = new MatchService(daviRepository, undefined, () => 'davi-match')
    const daviMatch = daviService.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const daviTurn = daviService.endTurn(daviMatch.id)
    daviRepository.save({
      ...daviTurn,
      resolvedKeys: [...daviTurn.resolvedKeys, 'security-log-gap'],
    })
    const afterDavi = daviService.resolveConversation({
      matchId: daviMatch.id,
      personId: 'davi',
      locationId: 'gallery',
      questionId: 'collectors',
    })
    expect(afterDavi.decks.livia.hand).toContainEqual(
      expect.objectContaining({ definitionId: 'guest-list', temporary: true }),
    )

    const raulRepository = new InMemoryMatchRepository()
    const raulService = new MatchService(raulRepository, undefined, () => 'raul-match')
    const raulMatch = raulService.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const raulTurn = raulService.endTurn(raulMatch.id)
    raulRepository.save({
      ...raulTurn,
      resolvedKeys: [...raulTurn.resolvedKeys, 'security-log-gap'],
    })
    setCurrentLocation(raulRepository, raulMatch.id, 'security')
    const afterRaul = raulService.resolveConversation({
      matchId: raulMatch.id,
      personId: 'raul',
      locationId: 'security',
      questionId: 'security-procedure',
    })
    expect(afterRaul.decks.livia.hand).toContainEqual(
      expect.objectContaining({ definitionId: 'patrol-map', temporary: true }),
    )
  })

  it('cobra 1 PA adicional da Lista de Convidados durante Pesquisar', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'otavio',
      supportInvestigatorId: 'rafael',
    })
    const roundTwo = service.endTurn(match.id)
    repository.save({
      ...roundTwo,
      actionPoints: { ...roundTwo.actionPoints, general: 4 },
      resolvedKeys: [...roundTwo.resolvedKeys, 'security-log-gap'],
    })
    const afterConversation = service.resolveConversation({
      matchId: match.id,
      personId: 'davi',
      locationId: 'gallery',
      questionId: 'collectors',
    })
    const guestList = putCardInHand(repository, afterConversation, 'guest-list', 'otavio')
    service.prepareCard(match.id, guestList.instanceId)

    const updated = service.resolveAction({
      matchId: match.id,
      action: 'research',
      locationId: 'gallery',
    })
    expect(updated.actionPoints).toMatchObject({ general: 0, specialty: 0 })
    expect(updated.decks.otavio.discardPile).not.toContainEqual(guestList)
    expect(updated.decks.otavio.hand).not.toContainEqual(guestList)
  })

  it('aplica o desconto de Lívia apenas no primeiro Examinar de cada local por rodada', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'livia-cost')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    const first = service.resolveAction({
      matchId: match.id,
      action: 'examine',
      locationId: 'gallery',
    })
    expect(first.actionPoints.general).toBe(4)
    expect(first.examinedLocationsThisRound).toEqual(['gallery'])

    const second = service.resolveAction({
      matchId: match.id,
      action: 'examine',
      locationId: 'gallery',
    })
    expect(second.actionPoints.general).toBe(2)

    const nextRound = service.endTurn(match.id)
    expect(nextRound.examinedLocationsThisRound).toEqual([])
    const firstNextRound = service.resolveAction({
      matchId: match.id,
      action: 'examine',
      locationId: 'gallery',
    })
    expect(firstNextRound.actionPoints.general).toBe(4)
  })

  it('Rafael confirma uma pista física não verificada apenas uma vez por rodada', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'rafael-passive')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'rafael',
      supportInvestigatorId: 'livia',
    })
    setCurrentLocation(repository, match.id, 'laboratory')

    const first = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'laboratory',
    })
    expect(first.journalEntries.at(-1)).toMatchObject({
      title: 'Marcas nas ferramentas',
      status: 'confirmed',
    })
    expect(first.journalEntries.at(-1)?.content).toContain('análise pericial')
    expect(first.hasUsedPassiveThisRound).toBe(true)

    const second = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'laboratory',
    })
    expect(second.journalEntries.at(-1)).toMatchObject({ type: 'observation' })
    expect(second.hasUsedPassiveThisRound).toBe(true)
  })

  it('Isadora marca uma declaração e recebe PA social ao refutá-la com evidência', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'isadora-passive')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'livia',
    })
    repository.save({
      ...match,
      currentLocationId: 'laboratory',
      resolvedKeys: ['gallery-lock', 'marta-tools'],
      journalEntries: [
        {
          id: 'journal-statement',
          type: 'statement',
          title: 'Declaração de Marta',
          content: 'Versão registrada.',
          locationId: 'laboratory',
          round: 1,
          status: 'recorded',
        },
      ],
    })

    const statement = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'technical-assessment',
    })
    expect(statement.journalEntries.at(-1)).toMatchObject({
      status: 'contestable',
      isadoraMarkedContestable: true,
    })
    expect(statement.hasUsedPassiveThisRound).toBe(true)
    expect(statement.hasSocialConnectionThisRound).toBe(true)

    const contradiction = service.resolveAction({
      matchId: match.id,
      action: 'analyse',
      locationId: 'laboratory',
    })
    expect(contradiction.journalEntries.at(-1)).toMatchObject({ status: 'refuted' })
    expect(contradiction.actionPoints).toMatchObject({ general: 1, specialty: 1 })
    expect(contradiction.hasReceivedSocialBonusThisRound).toBe(true)
  })

  it('Otávio gasta os PA de pesquisa e registra uma conexão entre pistas', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'otavio-connection')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'otavio',
      supportInvestigatorId: 'livia',
    })
    repository.save({
      ...match,
      actionPoints: { general: 0, specialty: 2, specialtyPoint: 'research' },
      journalEntries: [
        {
          id: 'clue-confirmed',
          type: 'clue',
          title: 'Pista confirmada',
          content: 'Registro confirmado.',
          locationId: 'security',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['means'],
          hypothesisThreadIds: ['route'],
        },
        {
          id: 'clue-opportunity',
          type: 'clue',
          title: 'Oportunidade confirmada',
          content: 'Registro confirmado.',
          locationId: 'gallery',
          round: 1,
          status: 'confirmed',
          evidenceAxes: ['opportunity'],
          hypothesisThreadIds: ['route'],
        },
      ],
    })

    const connected = service.resolveAction({
      matchId: match.id,
      action: 'research',
      locationId: 'gallery',
    })
    expect(connected.actionPoints).toMatchObject({ general: 0, specialty: 0 })
    expect(connected.journalEntries.at(-1)).toMatchObject({
      title: 'Cruzamento investigativo de Otávio',
      relatedEntryIds: ['clue-confirmed', 'clue-opportunity'],
    })
    expect(connected.resolvedKeys).toContain(
      'otavio-investigative-relation:clue-confirmed:clue-opportunity',
    )
    expect(connected.investigativeRelations).toContainEqual(
      expect.objectContaining({
        fromClueId: 'clue-confirmed',
        toClueId: 'clue-opportunity',
      }),
    )
  })
})

function putCardInHand(
  repository: InMemoryMatchRepository,
  match: ReturnType<MatchService['createSoloMatch']>,
  definitionId: string,
  investigatorId: InvestigatorId = 'isadora',
) {
  const currentMatch = repository.findById(match.id) ?? match
  const deck = currentMatch.decks[investigatorId]
  const card = [...deck.hand, ...deck.drawPile].find((item) => item.definitionId === definitionId)
  if (!card) throw new Error(`Carta ${definitionId} não foi criada.`)
  repository.save({
    ...currentMatch,
    decks: {
      ...currentMatch.decks,
      [investigatorId]: {
        ...deck,
        drawPile: deck.drawPile.filter((item) => item.instanceId !== card.instanceId),
        hand: deck.hand.some((item) => item.instanceId === card.instanceId)
          ? deck.hand
          : [...deck.hand, card],
      },
    },
  })
  return card
}

function setCurrentLocation(
  repository: InMemoryMatchRepository,
  matchId: string,
  locationId: ReturnType<MatchService['createSoloMatch']>['currentLocationId'],
): void {
  const match = repository.findById(matchId)
  if (!match) throw new Error('A partida precisa permanecer persistida.')
  repository.save({
    ...match,
    currentLocationId: locationId,
    unlockedLocations: [...new Set([...match.unlockedLocations, locationId])],
  })
}
