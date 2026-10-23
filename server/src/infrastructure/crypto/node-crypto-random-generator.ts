import { randomInt } from 'node:crypto'
import type { RandomGenerator } from '../../../../backend/application/ports/random-generator.js'

export class NodeCryptoRandomGenerator implements RandomGenerator {
  nextInt(maxExclusive: number): number {
    return randomInt(maxExclusive)
  }
}
