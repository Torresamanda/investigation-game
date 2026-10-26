import { beforeEach, vi } from 'vitest'

// jsdom has no native dialog implementation; keep observable open/close state in tests.
beforeEach(() => {
  window.scrollTo = vi.fn()
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = true
    }),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = false
    }),
  })
})
