import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback
  }

  observe(target) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: target.offsetWidth,
            height: target.offsetHeight,
          },
        },
      ],
      this,
    )
  }

  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock

Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: {
    configurable: true,
    get() {
      if (this.classList?.contains('react-flow__node')) {
        return this.getAttribute('data-id') === 'central' ? 38 : 28
      }

      return 800
    },
  },
  offsetHeight: {
    configurable: true,
    get() {
      if (this.classList?.contains('react-flow__node')) {
        return this.getAttribute('data-id') === 'central' ? 38 : 28
      }

      return 600
    },
  },
})
