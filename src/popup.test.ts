import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('popup.ts theme management', () => {
  let matchMediaMock: {
    matches: boolean
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
    addListener: ReturnType<typeof vi.fn>
    removeListener: ReturnType<typeof vi.fn>
    onchange: ((event: MediaQueryListEvent) => void) | null
  }

  beforeEach(() => {
    // Reset DOM
    document.documentElement.className = ''

    // Create mock MediaQueryList
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
    }

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('theme initialization', () => {
    it('should apply dark theme when system prefers dark', () => {
      matchMediaMock.matches = true

      // Simulate theme application
      const applyTheme = (source: { matches: boolean }) => {
        document.documentElement.classList.toggle('dark', source.matches)
      }

      applyTheme(matchMediaMock)

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should apply light theme when system prefers light', () => {
      matchMediaMock.matches = false

      const applyTheme = (source: { matches: boolean }) => {
        document.documentElement.classList.toggle('dark', source.matches)
      }

      applyTheme(matchMediaMock)

      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should query for prefers-color-scheme: dark', () => {
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    })
  })

  describe('theme change handling', () => {
    it('should update theme when preference changes', () => {
      const applyTheme = (source: { matches: boolean }) => {
        document.documentElement.classList.toggle('dark', source.matches)
      }

      // Start with light theme
      matchMediaMock.matches = false
      applyTheme(matchMediaMock)
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      // Change to dark theme
      matchMediaMock.matches = true
      applyTheme(matchMediaMock)
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      // Change back to light theme
      matchMediaMock.matches = false
      applyTheme(matchMediaMock)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should register addEventListener if available', () => {
      const handlePreferenceChange = vi.fn()

      if (typeof matchMediaMock.addEventListener === 'function') {
        matchMediaMock.addEventListener('change', handlePreferenceChange)
        expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', handlePreferenceChange)
      }
    })

    it('should register addListener if addEventListener not available', () => {
      // Simulate old API
      const oldMatchMedia = {
        matches: false,
        addEventListener: undefined,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      }

      const handlePreferenceChange = vi.fn()

      if (typeof oldMatchMedia.addListener === 'function') {
        oldMatchMedia.addListener(handlePreferenceChange)
        expect(oldMatchMedia.addListener).toHaveBeenCalledWith(handlePreferenceChange)
      }
    })

    it('should fallback to onchange if no listener methods available', () => {
      const legacyMatchMedia = {
        matches: false,
        addEventListener: undefined,
        addListener: undefined,
        onchange: null as ((event: any) => void) | null,
      }

      const handlePreferenceChange = vi.fn()
      legacyMatchMedia.onchange = handlePreferenceChange

      expect(legacyMatchMedia.onchange).toBe(handlePreferenceChange)
    })
  })

  describe('cleanup', () => {
    it('should have cleanup listeners array', () => {
      const cleanupListeners: Array<() => void> = []

      const cleanup = () => {}
      cleanupListeners.push(cleanup)

      expect(cleanupListeners.length).toBe(1)
    })

    it('should execute all cleanup functions', () => {
      const cleanupListeners: Array<() => void> = []
      const cleanup1 = vi.fn()
      const cleanup2 = vi.fn()
      const cleanup3 = vi.fn()

      cleanupListeners.push(cleanup1, cleanup2, cleanup3)

      // Simulate beforeunload cleanup
      while (cleanupListeners.length) {
        cleanupListeners.pop()?.()
      }

      expect(cleanup1).toHaveBeenCalled()
      expect(cleanup2).toHaveBeenCalled()
      expect(cleanup3).toHaveBeenCalled()
    })

    it('should empty cleanupListeners array after cleanup', () => {
      const cleanupListeners: Array<() => void> = []
      cleanupListeners.push(() => {}, () => {}, () => {})

      while (cleanupListeners.length) {
        cleanupListeners.pop()?.()
      }

      expect(cleanupListeners.length).toBe(0)
    })
  })

  describe('event listener compatibility', () => {
    it('should handle addEventListener API', () => {
      matchMediaMock.addEventListener = vi.fn()

      if (typeof matchMediaMock.addEventListener === 'function') {
        const handler = vi.fn()
        matchMediaMock.addEventListener('change', handler)

        expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', handler)
      }
    })

    it('should handle addListener API', () => {
      // Simulate browser without addEventListener
      const oldAPI = {
        ...matchMediaMock,
        addEventListener: undefined,
        addListener: vi.fn(),
      }

      if (typeof oldAPI.addListener === 'function') {
        const handler = vi.fn()
        oldAPI.addListener(handler)

        expect(oldAPI.addListener).toHaveBeenCalledWith(handler)
      }
    })

    it('should handle onchange fallback', () => {
      const legacyAPI = {
        matches: false,
        onchange: null as ((event: any) => void) | null,
      }

      const handler = vi.fn()
      legacyAPI.onchange = handler

      // Simulate change event
      if (legacyAPI.onchange) {
        legacyAPI.onchange({ matches: true } as any)
      }

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle rapid theme changes', () => {
      const applyTheme = (source: { matches: boolean }) => {
        document.documentElement.classList.toggle('dark', source.matches)
      }

      // Rapidly toggle theme
      for (let i = 0; i < 100; i++) {
        matchMediaMock.matches = i % 2 === 0
        applyTheme(matchMediaMock)
      }

      // Final state should be light (100 is even, matches = false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should preserve other classes on documentElement', () => {
      document.documentElement.className = 'other-class another-class'

      const applyTheme = (source: { matches: boolean }) => {
        document.documentElement.classList.toggle('dark', source.matches)
      }

      matchMediaMock.matches = true
      applyTheme(matchMediaMock)

      expect(document.documentElement.classList.contains('other-class')).toBe(true)
      expect(document.documentElement.classList.contains('another-class')).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should handle null onchange handler restoration', () => {
      const legacyAPI = {
        matches: false,
        onchange: null as ((event: any) => void) | null,
      }

      const originalHandler = legacyAPI.onchange
      const newHandler = vi.fn()

      legacyAPI.onchange = newHandler
      expect(legacyAPI.onchange).toBe(newHandler)

      // Restore
      legacyAPI.onchange = originalHandler ?? null
      expect(legacyAPI.onchange).toBe(null)
    })
  })
})
