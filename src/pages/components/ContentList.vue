<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const { type = 'localStorage' } = defineProps<{
  type: 'localStorage' | 'sessionStorage' | 'indexedDB'
}>()

type StorageEntry = {
  name: string
  value: string
}

const currentData = ref<StorageEntry[]>([])
const editingCell = ref<{ key: string, field: 'name' | 'value' } | null>(null)
const editingOriginalName = ref('')
const editingValue = ref('')

async function getStorageData() {
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
  }
  catch (error) {
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
  if (!persisted) {
    // Reload to reflect actual page state if persistence failed.
    getStorageData().then((data) => {
      currentData.value = data
    })
  }
}

watch(() => type, () => {
  getStorageData().then((data) => {
    currentData.value = data
    cancelEditingCell()
  })
}, { immediate: true })
</script>

<template>
  <Table>
    <TableCaption>A list of your recent invoices.</TableCaption>
    <TableBody>
      <TableRow
        v-for="item in currentData"
        :key="item.name"
      >
        <TableCell class="font-medium" @dblclick.stop="startEditingCell(item, 'name')">
          <template v-if="editingCell && editingCell.key === item.name && editingCell.field === 'name'">
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
          <a href="javascript:void(0);">删除</a>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
