import { describe, expect, it } from 'vitest'
import {
  parseCaseContentDefinition,
  type CaseContentDefinitionV1,
} from './case-content-definition.js'
import { case01Content } from './cases/case01/v1.js'

describe('parseCaseContentDefinition', () => {
  it('accepts the private, versioned Case 01 content', () => {
    expect(parseCaseContentDefinition(case01Content)).toBe(case01Content)
  })

  it('rejects an unsupported schema version', () => {
    expect(() => parseCaseContentDefinition({ ...case01Content, schemaVersion: 2 })).toThrow(
      'schema v1',
    )
  })

  it('rejects a rule that references missing evidence', () => {
    const invalidDefinition: CaseContentDefinitionV1 = {
      ...case01Content,
      actionRules: [
        ...case01Content.actionRules,
        {
          id: 'invalid-rule',
          action: 'examine',
          locationId: 'gallery',
          evidenceKey: 'missing-evidence',
        },
      ],
    }

    expect(() => parseCaseContentDefinition(invalidDefinition)).toThrow(
      'evidência da regra de ação inexistente',
    )
  })

  it('rejects duplicate evidence keys', () => {
    const invalidDefinition: CaseContentDefinitionV1 = {
      ...case01Content,
      evidence: [...case01Content.evidence, case01Content.evidence[0]!],
    }

    expect(() => parseCaseContentDefinition(invalidDefinition)).toThrow('evidência duplicada')
  })

  it('requires a crossing route for every contestable conversation outcome', () => {
    const raulConversation = case01Content.conversations.find(
      (conversation) => conversation.personId === 'raul',
    )
    if (!raulConversation) throw new Error('A conversa de Raul precisa existir.')
    const question = raulConversation.questions.find((item) => item.id === 'power-failure')
    if (!question?.outcomes) throw new Error('A pergunta precisa ter resultados configurados.')
    const invalidDefinition: CaseContentDefinitionV1 = {
      ...case01Content,
      conversations: case01Content.conversations.map((conversation) =>
        conversation.personId !== 'raul'
          ? conversation
          : {
              ...conversation,
              questions: conversation.questions.map((item) =>
                item.id !== 'power-failure'
                  ? item
                  : {
                      ...item,
                      outcomes: item.outcomes?.map((outcome) =>
                        outcome.status === 'contestable'
                          ? { ...outcome, contestableCrossing: undefined }
                          : outcome,
                      ),
                    },
              ),
            },
      ),
    }

    expect(() => parseCaseContentDefinition(invalidDefinition)).toThrow('schema v1')
  })
})
