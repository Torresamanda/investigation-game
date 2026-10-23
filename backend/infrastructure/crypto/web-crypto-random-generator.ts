import type { RandomGenerator } from '../../application/ports/random-generator.js'

type FillRandomValues = (values: Uint32Array) => Uint32Array

const maximumUint32 = 2 ** 32

export class WebCryptoRandomGenerator implements RandomGenerator {
  constructor(
    private readonly fillRandomValues: FillRandomValues = (values) =>
      globalThis.crypto.getRandomValues(values),
  ) {}

  nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > maximumUint32) {
      throw new RangeError('O limite do número aleatório precisa estar entre 1 e 2³².')
    }
    const acceptedRange = maximumUint32 - (maximumUint32 % maxExclusive)
    const values = new Uint32Array(1)
    do {
      this.fillRandomValues(values)
    } while (values[0] >= acceptedRange)
    return values[0] % maxExclusive
  }
}
