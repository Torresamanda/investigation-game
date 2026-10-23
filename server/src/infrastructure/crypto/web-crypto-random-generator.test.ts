import { describe, expect, it } from 'vitest'
import { WebCryptoRandomGenerator } from './web-crypto-random-generator.js'

describe('WebCryptoRandomGenerator', () => {
  it('retries rejected values to avoid modulo bias', () => {
    const values = [0xffffffff, 17]
    const generator = new WebCryptoRandomGenerator((target) => {
      target[0] = values.shift() ?? 0
      return target
    })

    expect(generator.nextInt(10)).toBe(7)
  })

  it('rejects invalid exclusive limits', () => {
    const generator = new WebCryptoRandomGenerator()

    expect(() => generator.nextInt(0)).toThrow(RangeError)
    expect(() => generator.nextInt(2 ** 32 + 1)).toThrow(RangeError)
  })
})
