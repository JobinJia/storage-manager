import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, type GlobalSettings } from './index'

describe('store/index', () => {
  let store: ReturnType<typeof useStore>

  beforeEach(() => {
    store = useStore()
    // Reset store to default state before each test
    store.restore()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(store.storeData.value).toEqual({
        copyType: false,
        syncUrl: '',
        refreshToken: 0,
      })
    })
  })

  describe('setCopyType', () => {
    it('should update copyType to true', () => {
      store.setCopyType(true)
      expect(store.storeData.value.copyType).toBe(true)
    })

    it('should update copyType to false', () => {
      store.setCopyType(true)
      store.setCopyType(false)
      expect(store.storeData.value.copyType).toBe(false)
    })
  })

  describe('setSyncUrl', () => {
    it('should update syncUrl with valid URL', () => {
      const testUrl = 'https://example.com'
      store.setSyncUrl(testUrl)
      expect(store.storeData.value.syncUrl).toBe(testUrl)
    })

    it('should update syncUrl to empty string', () => {
      store.setSyncUrl('https://example.com')
      store.setSyncUrl('')
      expect(store.storeData.value.syncUrl).toBe('')
    })

    it('should handle multiple URL changes', () => {
      const urls = ['https://example.com', 'https://test.com', 'https://final.com']
      urls.forEach((url) => {
        store.setSyncUrl(url)
        expect(store.storeData.value.syncUrl).toBe(url)
      })
    })
  })

  describe('triggerRefresh', () => {
    it('should increment refreshToken by 1', () => {
      const initialToken = store.storeData.value.refreshToken
      store.triggerRefresh()
      expect(store.storeData.value.refreshToken).toBe(initialToken + 1)
    })

    it('should increment refreshToken multiple times', () => {
      const initialToken = store.storeData.value.refreshToken
      const incrementCount = 5

      for (let i = 0; i < incrementCount; i++) {
        store.triggerRefresh()
      }

      expect(store.storeData.value.refreshToken).toBe(initialToken + incrementCount)
    })
  })

  describe('restore', () => {
    it('should reset all values to defaults', () => {
      // Change all values
      store.setCopyType(true)
      store.setSyncUrl('https://example.com')
      store.triggerRefresh()
      store.triggerRefresh()

      // Verify values were changed
      expect(store.storeData.value).not.toEqual({
        copyType: false,
        syncUrl: '',
        refreshToken: 0,
      })

      // Restore
      store.restore()

      // Verify reset
      expect(store.storeData.value).toEqual({
        copyType: false,
        syncUrl: '',
        refreshToken: 0,
      })
    })

    it('should reset partial changes', () => {
      store.setCopyType(true)

      store.restore()

      expect(store.storeData.value.copyType).toBe(false)
      expect(store.storeData.value.syncUrl).toBe('')
      expect(store.storeData.value.refreshToken).toBe(0)
    })
  })

  describe('reactivity', () => {
    it('should maintain reactivity after updates', () => {
      const initialValue = store.storeData.value

      store.setCopyType(true)

      // The reference should be the same (reactive)
      expect(store.storeData.value).toBe(initialValue)
      expect(store.storeData.value.copyType).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid successive calls', () => {
      for (let i = 0; i < 100; i++) {
        store.triggerRefresh()
      }
      expect(store.storeData.value.refreshToken).toBe(100)
    })

    it('should handle empty string syncUrl', () => {
      store.setSyncUrl('')
      expect(store.storeData.value.syncUrl).toBe('')
    })

    it('should handle very long syncUrl', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000)
      store.setSyncUrl(longUrl)
      expect(store.storeData.value.syncUrl).toBe(longUrl)
    })
  })
})
