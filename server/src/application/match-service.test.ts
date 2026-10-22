import { describe, expect, it } from 'vitest'
import { MatchService } from './match-service.js'
import { InMemoryMatchRepository } from '../infrastructure/persistence/in-memory-match-repository.js'
import type { InvestigatorId } from '../domain/match.js'

describe('MatchService', () => {
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
      title: 'Fechadura de emergência',
    })
    expect(second.journalEntries[1]).toMatchObject({ type: 'clue', title: 'Vestígio no pedestal' })
    expect(third.journalEntries[2]).toMatchObject({
      type: 'observation',
      title: 'Nenhuma descoberta nova',
    })
    expect(third.actionPoints.general).toBe(3)
  })

  it('renova a mão com quatro cartas ao avançar para a rodada seguinte', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const updated = service.endTurn(match.id)

    expect(updated.decks.livia.hand).toHaveLength(4)
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

  it('valida a carta preparada e a move para o descarte após uma ação compatível', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const card = match.decks.livia.hand[0]
    if (!card) throw new Error('A mão inicial precisa conter cartas para este cenário.')
    const action = card.compatibleActions[0]
    if (!action || action === 'converse') {
      throw new Error('A primeira carta precisa ser compatível com uma ação de cenário.')
    }
    service.prepareCard(match.id, card.instanceId)

    const updated = service.resolveAction({
      matchId: match.id,
      action,
      locationId: 'gallery',
    })

    expect(updated.decks.livia.hand).not.toContainEqual(card)
    expect(updated.decks.livia.discardPile).toContainEqual(card)
    expect(updated.actionPoints.general).toBe(3 - card.cost)
  })

  it('oferece perguntas da pessoa presente e registra a declaração ao resolvê-la', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    service.createSoloMatch({ activeInvestigatorId: 'isadora', supportInvestigatorId: 'rafael' })

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
    const limitedOptions = service.getConversationOptions('match-1', 'marta', 'laboratory')
    expect(limitedOptions.questions).toHaveLength(2)
    expect(limitedOptions.questionLimitReached).toBe(true)
    expect(limitedOptions.questions.every((question) => !question.canResolve)).toBe(true)
  })

  it('mantém perguntas dependentes de evidência visíveis, mas bloqueadas sem consumir o turno', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    const options = service.getConversationOptions(match.id, 'marta', 'laboratory')
    const fingerprints = options.questions.find((question) => question.id === 'fingerprints')
    expect(fingerprints).toMatchObject({
      canResolve: false,
      isEvidenceBlocked: true,
    })
    expect(() =>
      service.resolveConversation({
        matchId: match.id,
        personId: 'marta',
        locationId: 'laboratory',
        questionId: 'fingerprints',
      }),
    ).toThrow('Diálogo bloqueado: necessário evidência')
    expect(service.getMatch(match.id)).toEqual(match)
  })

  it('bloqueia recompensas temporárias até a rodada em que elas podem ser entregues', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const options = service.getConversationOptions(match.id, 'davi', 'gallery')
    expect(options.questions.find((question) => question.id === 'collectors')).toMatchObject({
      canResolve: false,
      isEvidenceBlocked: true,
    })
  })

  it('aceita uma pergunta por pessoa a cada turno e libera outra na rodada seguinte', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    service.resolveConversation({
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
        questionId: 'technical-assessment',
      }),
    ).toThrow('Você já fez uma pergunta neste turno.')

    const otherPerson = service.resolveConversation({
      matchId: match.id,
      personId: 'raul',
      locationId: 'security',
      questionId: 'museum-routine',
    })
    expect(otherPerson.journalEntries).toHaveLength(2)

    service.endTurn(match.id)
    const nextTurn = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'technical-assessment',
    })
    expect(nextTurn.journalEntries).toHaveLength(3)
  })

  it('rejeita conversa fora do local, pergunta inexistente ou já resolvida sem alterar a partida', () => {
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    expect(() => service.getConversationOptions(match.id, 'marta', 'gallery')).toThrow(
      'Esta pessoa não está disponível neste local.',
    )
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
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    expect(() =>
      service.resolveConversation({
        matchId: match.id,
        personId: 'marta',
        locationId: 'laboratory',
        questionId: 'fingerprints',
      }),
    ).toThrow('Diálogo bloqueado: necessário evidência')

    const corroboratedService = new MatchService(
      new InMemoryMatchRepository(),
      undefined,
      () => 'match-2',
    )
    const corroboratedMatch = corroboratedService.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    const afterGallery = corroboratedService.resolveAction({
      matchId: corroboratedMatch.id,
      action: 'examine',
      locationId: 'gallery',
    })
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

  it('usa Pausa Calculada para liberar uma pergunta adicional gratuita', () => {
    const repository = new InMemoryMatchRepository()
    const service = new MatchService(repository, undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'isadora',
      supportInvestigatorId: 'rafael',
    })
    const pause = putCardInHand(repository, match, 'calculated-pause')
    service.prepareCard(match.id, pause.instanceId)

    service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'davi-interest',
    })
    const options = service.getConversationOptions(match.id, 'marta', 'laboratory')
    expect(options.questionLimitReached).toBe(false)
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
    const afterFirstQuestion = service.resolveConversation({
      matchId: match.id,
      personId: 'marta',
      locationId: 'laboratory',
      questionId: 'davi-interest',
    })
    const pause = putCardInHand(repository, afterFirstQuestion, 'calculated-pause')
    service.prepareCard(match.id, pause.instanceId)

    const options = service.getConversationOptions(match.id, 'marta', 'laboratory')
    expect(options.questionLimitReached).toBe(false)
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
    const service = new MatchService(new InMemoryMatchRepository(), undefined, () => 'match-1')
    const match = service.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })

    const updated = service.resolveConversation({
      matchId: match.id,
      personId: 'helena',
      locationId: 'office',
      questionId: 'insurance-review',
    })

    expect(updated.decks.livia.drawPile).toContainEqual(
      expect.objectContaining({ definitionId: 'curator-agenda', temporary: true }),
    )
  })

  it('concede as cartas temporárias de Davi e Raul quando suas conversas são liberadas', () => {
    const daviService = new MatchService(
      new InMemoryMatchRepository(),
      undefined,
      () => 'davi-match',
    )
    const daviMatch = daviService.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    daviService.endTurn(daviMatch.id)
    const afterDavi = daviService.resolveConversation({
      matchId: daviMatch.id,
      personId: 'davi',
      locationId: 'gallery',
      questionId: 'collectors',
    })
    expect(afterDavi.decks.livia.drawPile).toContainEqual(
      expect.objectContaining({ definitionId: 'guest-list', temporary: true }),
    )

    const raulService = new MatchService(
      new InMemoryMatchRepository(),
      undefined,
      () => 'raul-match',
    )
    const raulMatch = raulService.createSoloMatch({
      activeInvestigatorId: 'livia',
      supportInvestigatorId: 'rafael',
    })
    raulService.endTurn(raulMatch.id)
    const afterRaul = raulService.resolveConversation({
      matchId: raulMatch.id,
      personId: 'raul',
      locationId: 'security',
      questionId: 'security-procedure',
    })
    expect(afterRaul.decks.livia.drawPile).toContainEqual(
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
    service.endTurn(match.id)
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
    expect(updated.decks.otavio.discardPile).toContainEqual(guestList)
  })
})

function putCardInHand(
  repository: InMemoryMatchRepository,
  match: ReturnType<MatchService['createSoloMatch']>,
  definitionId: string,
  investigatorId: InvestigatorId = 'isadora',
) {
  const deck = match.decks[investigatorId]
  const card = [...deck.hand, ...deck.drawPile].find((item) => item.definitionId === definitionId)
  if (!card) throw new Error(`Carta ${definitionId} não foi criada.`)
  repository.save({
    ...match,
    decks: {
      ...match.decks,
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
