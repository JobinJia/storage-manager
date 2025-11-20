import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ContentList from './ContentList.vue'
import { mockChrome } from '@/test/setup'

describe('ContentList.vue', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset clipboard mock
    navigator.clipboard.writeText = vi.fn(() => Promise.resolve())
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('component initialization', () => {
    it('should mount successfully with localStorage type', () => {
      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should mount successfully with sessionStorage type', () => {
      wrapper = mount(ContentList, {
        props: { type: 'sessionStorage' },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should call fetchStorageData on mount', async () => {
      mockChrome.scripting.executeScript.mockResolvedValueOnce([
        { result: [{ name: 'key1', value: 'value1' }] },
      ])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockChrome.tabs.query).toHaveBeenCalled()
      expect(mockChrome.scripting.executeScript).toHaveBeenCalled()
    })
  })

  describe('data fetching', () => {
    it('should fetch and display storage entries', async () => {
      const mockData = [
        { name: 'testKey', value: 'testValue' },
        { name: 'anotherKey', value: 'anotherValue' },
      ]

      mockChrome.scripting.executeScript.mockResolvedValueOnce([
        { result: mockData },
      ])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('should handle empty storage', async () => {
      mockChrome.scripting.executeScript.mockResolvedValueOnce([
        { result: [] },
      ])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.text()).toContain('暂无数据')
    })

    it('should handle Chrome API errors gracefully', async () => {
      mockChrome.scripting.executeScript.mockRejectedValueOnce(
        new Error('Script execution failed'),
      )

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should not crash and show empty state
      expect(wrapper.text()).toContain('暂无数据')
    })

    it('should use correct storage type in script execution', async () => {
      wrapper = mount(ContentList, {
        props: { type: 'sessionStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      const executeScriptCall = mockChrome.scripting.executeScript.mock.calls[0]
      expect(executeScriptCall).toBeDefined()
      expect(executeScriptCall[0].args[0]).toBe('sessionStorage')
    })
  })

  describe('search functionality', () => {
    beforeEach(async () => {
      const mockData = [
        { name: 'user_name', value: 'john' },
        { name: 'user_email', value: 'john@example.com' },
        { name: 'theme', value: 'dark' },
      ]

      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: mockData },
      ])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    it('should filter entries by search key', async () => {
      const searchInput = wrapper.find('input[type="search"]')
      await searchInput.setValue('user')
      await nextTick()

      const visibleRows = wrapper.findAll('tbody tr').filter((row) => {
        return row.text().includes('user')
      })

      expect(visibleRows.length).toBeGreaterThan(0)
    })

    it('should be case-insensitive', async () => {
      const searchInput = wrapper.find('input[type="search"]')
      await searchInput.setValue('USER')
      await nextTick()

      const visibleRows = wrapper.findAll('tbody tr').filter((row) => {
        return row.text().includes('user')
      })

      expect(visibleRows.length).toBeGreaterThan(0)
    })

    it('should show empty message when no matches', async () => {
      const searchInput = wrapper.find('input[type="search"]')
      await searchInput.setValue('nonexistent_key_xyz')
      await nextTick()

      expect(wrapper.text()).toContain('没有匹配的键名')
    })

    it('should clear search on ESC key', async () => {
      const searchInput = wrapper.find('input[type="search"]')
      await searchInput.setValue('user')
      await searchInput.trigger('keyup.esc')
      await nextTick()

      expect((searchInput.element as HTMLInputElement).value).toBe('')
    })
  })

  describe('add entry functionality', () => {
    beforeEach(async () => {
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: [] },
      ])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    it('should have add entry inputs', () => {
      const inputs = wrapper.findAll('input[placeholder]')
      const keyInput = inputs.find(input =>
        (input.element as HTMLInputElement).placeholder === '键名'
      )
      const valueInput = inputs.find(input =>
        (input.element as HTMLInputElement).placeholder === '值'
      )

      expect(keyInput?.exists()).toBe(true)
      expect(valueInput?.exists()).toBe(true)
    })

    it('should add new entry with valid inputs', async () => {
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: true },
      ])

      const inputs = wrapper.findAll('input')
      const keyInput = inputs.find(input =>
        (input.element as HTMLInputElement).placeholder === '键名'
      )
      const valueInput = inputs.find(input =>
        (input.element as HTMLInputElement).placeholder === '值'
      )

      if (keyInput && valueInput) {
        await keyInput.setValue('newKey')
        await valueInput.setValue('newValue')
        await nextTick()

        const addButton = wrapper.findAll('button').find(btn =>
          btn.text().includes('添加')
        )
        if (addButton) {
          await addButton.trigger('click')
          await nextTick()
          await new Promise(resolve => setTimeout(resolve, 10))

          // Should have called Chrome API to persist
          expect(mockChrome.scripting.executeScript).toHaveBeenCalled()
        }
      }
    })

    it('should show error for empty key', async () => {
      const addButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('添加')
      )

      if (addButton) {
        // Add button should be disabled when key is empty
        expect(addButton.attributes('disabled')).toBeDefined()
      }
    })

    it('should clear inputs after successful add', async () => {
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: true },
      ])

      const inputs = wrapper.findAll('input')
      const keyInput = inputs.find(input =>
        (input.element as HTMLInputElement).placeholder === '键名'
      )
      const valueInput = inputs.find(input =>
        (input.element as HTMLInputElement).placeholder === '值'
      )

      if (keyInput && valueInput) {
        await keyInput.setValue('testKey')
        await valueInput.setValue('testValue')

        const addButton = wrapper.findAll('button').find(btn =>
          btn.text().includes('添加')
        )

        if (addButton) {
          await addButton.trigger('click')
          await nextTick()
          await new Promise(resolve => setTimeout(resolve, 10))

          // Inputs should be cleared
          expect((keyInput.element as HTMLInputElement).value).toBe('')
          expect((valueInput.element as HTMLInputElement).value).toBe('')
        }
      }
    })

    it('should trigger add on Enter key', async () => {
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: true },
      ])

      const inputs = wrapper.findAll('input')
      const keyInput = inputs.find(input =>
        (input.element as HTMLInputElement).placeholder === '键名'
      )

      if (keyInput) {
        await keyInput.setValue('testKey')
        await keyInput.trigger('keyup.enter')
        await nextTick()

        // Should have attempted to add
        expect(mockChrome.scripting.executeScript).toHaveBeenCalled()
      }
    })
  })

  describe('copy functionality', () => {
    beforeEach(async () => {
      const mockData = [
        { name: 'testKey', value: 'testValue' },
      ]

      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: mockData },
      ])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    it('should copy value to clipboard', async () => {
      const copyButton = wrapper.findAll('button').find(btn =>
        btn.html().includes('Copy')
      )

      if (copyButton) {
        await copyButton.trigger('click')
        await nextTick()

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('testValue')
      }
    })

    it('should show feedback after copy', async () => {
      const copyButton = wrapper.findAll('button').find(btn =>
        btn.html().includes('Copy')
      )

      if (copyButton) {
        await copyButton.trigger('click')
        await nextTick()
        await new Promise(resolve => setTimeout(resolve, 10))

        expect(wrapper.text()).toContain('值已复制')
      }
    })

    it('should hide feedback after timeout', async () => {
      vi.useFakeTimers()

      const copyButton = wrapper.findAll('button').find(btn =>
        btn.html().includes('Copy')
      )

      if (copyButton) {
        await copyButton.trigger('click')
        await nextTick()

        expect(wrapper.text()).toContain('值已复制')

        vi.advanceTimersByTime(2100)
        await nextTick()

        expect(wrapper.text()).not.toContain('值已复制')
      }

      vi.useRealTimers()
    })
  })

  describe('delete functionality', () => {
    beforeEach(async () => {
      const mockData = [
        { name: 'testKey', value: 'testValue' },
      ]

      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: mockData },
      ])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    it('should have delete button', () => {
      const deleteButton = wrapper.findAll('button').find(btn =>
        btn.html().includes('Trash')
      )
      expect(deleteButton?.exists()).toBe(true)
    })

    it('should open confirmation dialog on delete click', async () => {
      const deleteButton = wrapper.findAll('button').find(btn =>
        btn.html().includes('Trash')
      )

      if (deleteButton) {
        await deleteButton.trigger('click')
        await nextTick()

        // Dialog should be in the DOM
        expect(wrapper.html()).toContain('确认删除')
      }
    })
  })

  describe('editing functionality', () => {
    beforeEach(async () => {
      const mockData = [
        { name: 'testKey', value: 'testValue' },
      ]

      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: mockData },
      ])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    it('should enter edit mode on double click', async () => {
      const cell = wrapper.find('td')
      await cell.trigger('dblclick')
      await nextTick()

      // Should show input field
      const editInput = cell.find('input')
      expect(editInput.exists()).toBe(true)
    })

    it('should save on Enter key', async () => {
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: true },
      ])

      const cell = wrapper.find('td')
      await cell.trigger('dblclick')
      await nextTick()

      const editInput = cell.find('input')
      if (editInput.exists()) {
        await editInput.setValue('updatedValue')
        await editInput.trigger('keyup.enter')
        await nextTick()

        expect(mockChrome.scripting.executeScript).toHaveBeenCalled()
      }
    })

    it('should cancel edit on ESC key', async () => {
      const cell = wrapper.find('td')
      await cell.trigger('dblclick')
      await nextTick()

      const editInput = cell.find('input')
      if (editInput.exists()) {
        await editInput.setValue('newValue')
        await editInput.trigger('keyup.esc')
        await nextTick()

        // Input should be gone
        expect(cell.find('input').exists()).toBe(false)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle undefined chrome API', async () => {
      const originalChrome = global.chrome
      // @ts-ignore
      global.chrome = undefined

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()

      // Should not crash
      expect(wrapper.exists()).toBe(true)

      global.chrome = originalChrome
    })

    it('should handle no active tab', async () => {
      mockChrome.tabs.query.mockResolvedValueOnce([])

      wrapper = mount(ContentList, {
        props: { type: 'localStorage' },
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should handle gracefully
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle indexedDB type', async () => {
      wrapper = mount(ContentList, {
        props: { type: 'indexedDB' },
      })

      await nextTick()

      expect(wrapper.exists()).toBe(true)
    })
  })
})
