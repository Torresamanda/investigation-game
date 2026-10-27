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
})
