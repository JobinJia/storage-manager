<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStore } from '@/store'
import AlertDialog from './AlertDialog.vue'

const { type = 'localStorage' } = defineProps<{
  type: 'localStorage' | 'sessionStorage' | 'indexedDB'
}>()

interface StorageEntry {
  name: string
  value: string
}

const currentData = ref<StorageEntry[]>([])
const editingCell = ref<{ key: string, field: 'name' | 'value' } | null>(null)
const editingOriginalName = ref('')
const editingValue = ref('')
const feedbackMessage = ref('')
let feedbackTimer: ReturnType<typeof window.setTimeout> | null = null
const { storeData } = useStore()
const copyAsJsSnippet = computed(() => storeData.value.copyType)
const deleteDialogOpen = ref(false)
const pendingDelete = ref<StorageEntry | null>(null)

async function fetchStorageData() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.scripting?.executeScript)
    return []

  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
  })

  const tabId = tabs[0]?.id
  if (!tabId)
    return []

  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId },
      args: [type],
      func: (storageType: 'localStorage' | 'sessionStorage' | 'indexedDB') => {
        if (storageType === 'indexedDB')
          return []

        const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage
        const entries: Array<{ name: string, value: string }> = []
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i)
          if (!key)
            continue
          const value = storage.getItem(key)
          entries.push({ name: key, value: value ?? '' })
        }
        return entries
      },
    })

    const result = injectionResults[0]?.result
    return Array.isArray(result) ? result : []
  } catch (error) {
    console.warn('Failed to load storage data', error)
    return []
  }
}

function loadStorageData() {
  fetchStorageData().then((data) => {
    currentData.value = data
    cancelEditingCell()
  })
}

function startEditingCell(entry: StorageEntry, field: 'name' | 'value') {
  editingCell.value = { key: entry.name, field }
  editingOriginalName.value = entry.name
  editingValue.value = field === 'name' ? entry.name : entry.value
}

function cancelEditingCell() {
  editingCell.value = null
  editingOriginalName.value = ''
  editingValue.value = ''
}

async function persistStorageUpdate(originalName: string, nextEntry: StorageEntry) {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.scripting?.executeScript)
    return false

  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
  })

  const tabId = tabs[0]?.id
  if (!tabId)
    return false

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [type, originalName, nextEntry],
      func: (
        storageType: 'localStorage' | 'sessionStorage' | 'indexedDB',
        originalKey: string,
        entry: StorageEntry,
      ) => {
        if (storageType === 'indexedDB')
          return false

        const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage

        if (originalKey !== entry.name)
          storage.removeItem(originalKey)

        storage.setItem(entry.name, entry.value)
        return true
      },
      world: 'MAIN',
    })

    return Boolean(result?.result)
  } catch (error) {
    console.warn('Failed to update storage entry', error)
    return false
  }
}

async function saveEditingCell() {
  if (!editingCell.value)
    return

  const { key, field } = editingCell.value
  const originalName = editingOriginalName.value || key
  const nextValue = editingValue.value

  if (field === 'name' && !nextValue)
    return

  const index = currentData.value.findIndex(entry => entry.name === key)
  if (index === -1)
    return

  const updatedEntry: StorageEntry = { ...currentData.value[index] }
  if (field === 'name')
    updatedEntry.name = nextValue
  else
    updatedEntry.value = nextValue

  const updatedLocally = [...currentData.value]
  updatedLocally[index] = updatedEntry

  currentData.value = updatedLocally
  cancelEditingCell()

  const persisted = await persistStorageUpdate(originalName, updatedEntry)
  if (!persisted)
    loadStorageData()
}

function showFeedback(message: string) {
  feedbackMessage.value = message
  if (feedbackTimer)
    window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => {
    feedbackMessage.value = ''
    feedbackTimer = null
  }, 2000)
}

onBeforeUnmount(() => {
  if (feedbackTimer)
    window.clearTimeout(feedbackTimer)
})

async function copyEntry(entry: StorageEntry, event?: MouseEvent) {
  if (event && event.type !== 'contextmenu' && event.defaultPrevented)
    return

  if (event) {
    const target = event.target as HTMLElement | null
    if (target?.closest('input,button,a,textarea,label'))
      return
    if (event.detail > 1)
      return
  }

  const storageIdentifier = type === 'sessionStorage' ? 'sessionStorage' : 'localStorage'
  const keySnippet = JSON.stringify(entry.name)
  const valueSnippet = JSON.stringify(entry.value)
  const payload = copyAsJsSnippet.value
    ? `${storageIdentifier}.setItem(${keySnippet}, ${valueSnippet})`
    : entry.value
  const successMessage = copyAsJsSnippet.value
    ? `已复制 ${storageIdentifier}.setItem(${entry.name}, ...)`
    : '值已复制'

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
      showFeedback(successMessage)
      return
    }
  } catch (error) {
    console.warn('Failed to write via navigator.clipboard', error)
  }

  const textarea = document.createElement('textarea')
  textarea.value = payload
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    showFeedback(successMessage)
  } catch (error) {
    console.warn('Fallback clipboard copy failed', error)
    showFeedback('复制失败，请重试')
  }
  document.body.removeChild(textarea)
}

async function removeStorageEntry(key: string) {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.scripting?.executeScript)
    return false

  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
  })

  const tabId = tabs[0]?.id
  if (!tabId)
    return false

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [type, key],
      func: (storageType: 'localStorage' | 'sessionStorage' | 'indexedDB', entryKey: string) => {
        if (storageType === 'indexedDB')
          return false

        const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage
        storage.removeItem(entryKey)
        return true
      },
      world: 'MAIN',
    })

    return Boolean(result?.result)
  } catch (error) {
    console.warn('Failed to remove storage entry', error)
    return false
  }
}

function openDeleteDialog(entry: StorageEntry) {
  pendingDelete.value = entry
  deleteDialogOpen.value = true
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false
  pendingDelete.value = null
}

async function confirmDelete() {
  const entry = pendingDelete.value
  if (!entry) {
    closeDeleteDialog()
    return
  }

  if (type === 'indexedDB') {
    showFeedback('暂不支持删除 IndexedDB 数据')
    closeDeleteDialog()
    return
  }

  const removed = await removeStorageEntry(entry.name)
  if (removed) {
    currentData.value = currentData.value.filter(item => item.name !== entry.name)
    if (editingCell.value?.key === entry.name)
      cancelEditingCell()
    loadStorageData()
    showFeedback(`已删除 ${entry.name}`)
  } else {
    showFeedback('删除失败，请重试')
  }

  closeDeleteDialog()
}

watch(() => type, () => {
  loadStorageData()
}, { immediate: true })

watch(() => storeData.value.refreshToken, () => {
  loadStorageData()
})

watch(deleteDialogOpen, (isOpen) => {
  if (!isOpen)
    pendingDelete.value = null
})
</script>

<template>
  <div
    v-if="feedbackMessage"
    class="fixed top-20 left-1/2 z-50 mb-2 -translate-x-1/2 rounded border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 shadow-md"
  >
    {{ feedbackMessage }}
  </div>
  <Table>
    <TableCaption>A list of your recent invoices.</TableCaption>
    <TableBody>
      <TableRow
        v-for="item in currentData"
        :key="item.name"
        class="select-none"
        @contextmenu.prevent="copyEntry(item, $event)"
      >
        <TableCell class="font-medium" @dblclick.stop="startEditingCell(item, 'name')">
          <template v-if="editingCell && editingCell.key === item.name && editingCell.field === 'name'">
            <input
              v-model="editingValue"
              class="w-full rounded border border-border px-1 py-0.5"
              autofocus
              @blur="saveEditingCell"
              @focusout="saveEditingCell"
              @keyup.enter.prevent="saveEditingCell"
              @keyup.esc.prevent="cancelEditingCell"
            >
          </template>
          <template v-else>
            {{ item.name }}
          </template>
        </TableCell>
        <TableCell class="truncate max-w-[120px]" @dblclick.stop="startEditingCell(item, 'value')">
          <template v-if="editingCell && editingCell.key === item.name && editingCell.field === 'value'">
            <input
              v-model="editingValue"
              class="w-full rounded border border-border px-1 py-0.5"
              autofocus
              @blur="saveEditingCell"
              @keyup.enter.prevent="saveEditingCell"
              @keyup.esc.prevent="cancelEditingCell"
            >
          </template>
          <template v-else>
            {{ item.value }}
          </template>
        </TableCell>
        <TableCell>
          <button
            class="px-2 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600"
            @click.stop="openDeleteDialog(item)"
          >
            删除
          </button>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <AlertDialog
    v-model:open="deleteDialogOpen"
    :title="pendingDelete ? `确认删除 ${pendingDelete.name}？` : '确认删除？'"
    description="删除后不可恢复"
    @ok="confirmDelete"
    @cancel="closeDeleteDialog"
  />
</template>
