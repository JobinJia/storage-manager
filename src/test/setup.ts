import { vi } from 'vitest'

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    query: vi.fn((queryInfo: chrome.tabs.QueryInfo, callback?: (tabs: chrome.tabs.Tab[]) => void) => {
      const mockTab: chrome.tabs.Tab = {
        id: 1,
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: true,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      }
      if (callback) {
        callback([mockTab])
      }
      return Promise.resolve([mockTab])
    }),
  },
  scripting: {
    executeScript: vi.fn((injection: chrome.scripting.ScriptInjection) => {
      // Mock execution result based on the function
      return Promise.resolve([{ result: [] }])
    }),
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn(),
    },
  },
}

// Set up global chrome object
global.chrome = mockChrome as any

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
  writable: true,
})

// Mock document.execCommand
document.execCommand = vi.fn(() => true)

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Export for use in tests
export { mockChrome }
