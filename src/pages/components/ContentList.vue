<script setup lang="ts">
import { Check, Copy, Plus, Trash2 } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
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
const newEntryKey = ref('')
const newEntryValue = ref('')
const adding = ref(false)
const searchKey = ref('')

// 选中行状态
const selectedRowKey = ref<string | null>(null)
// 复制成功闪烁效果
const copiedRowKey = ref<string | null>(null)
// 表格容器引用
const tableContainerRef = ref<HTMLElement | null>(null)

const filteredData = computed(() => {
  const query = searchKey.value.trim().toLowerCase()
  if (!query)
    return currentData.value
  return currentData.value.filter(entry => entry.name.toLowerCase().includes(query))
})

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
  selectedRowKey.value = entry.name
}

// 选中行
function selectRow(entry: StorageEntry) {
  // 如果正在编辑其他行，先保存
  if (editingCell.value && editingCell.value.key !== entry.name) {
    saveEditingCell()
  }
  selectedRowKey.value = entry.name
}

// 单击进入编辑（如果已选中则编辑，否则先选中）
function handleCellClick(entry: StorageEntry, field: 'name' | 'value') {
  // 如果正在编辑其他单元格，先保存
  if (editingCell.value && (editingCell.value.key !== entry.name || editingCell.value.field !== field)) {
    saveEditingCell()
    nextTick(() => {
      selectRow(entry)
    })
    return
  }
  if (editingCell.value)
    return
  if (selectedRowKey.value === entry.name) {
    startEditingCell(entry, field)
  } else {
    selectRow(entry)
  }
}

// 点击表格容器时处理编辑状态
function handleContainerClick(event: MouseEvent) {
  if (!editingCell.value)
    return

  const target = event.target as HTMLElement
  // 如果点击的是当前编辑的输入框，不做处理
  if (target.tagName === 'INPUT')
    return

  // 点击其他区域（包括表头、其他行、空白区域）时保存编辑
  saveEditingCell()
}

// 获取当前选中行的索引
function getSelectedIndex() {
  if (!selectedRowKey.value)
    return -1
  return filteredData.value.findIndex(item => item.name === selectedRowKey.value)
}

// 键盘导航
function handleKeyDown(event: KeyboardEvent) {
  // 如果正在编辑，不处理导航
  if (editingCell.value)
    return

  const currentIndex = getSelectedIndex()

  switch (event.key) {
    case 'ArrowUp': {
      event.preventDefault()
      if (currentIndex > 0) {
        selectedRowKey.value = filteredData.value[currentIndex - 1].name
        scrollToSelectedRow()
      } else if (currentIndex === -1 && filteredData.value.length > 0) {
        selectedRowKey.value = filteredData.value[filteredData.value.length - 1].name
        scrollToSelectedRow()
      }
      break
    }
    case 'ArrowDown': {
      event.preventDefault()
      if (currentIndex < filteredData.value.length - 1) {
        selectedRowKey.value = filteredData.value[currentIndex + 1].name
        scrollToSelectedRow()
      } else if (currentIndex === -1 && filteredData.value.length > 0) {
        selectedRowKey.value = filteredData.value[0].name
        scrollToSelectedRow()
      }
      break
    }
    case 'Enter': {
      event.preventDefault()
      if (currentIndex >= 0) {
        const entry = filteredData.value[currentIndex]
        startEditingCell(entry, 'value')
      }
      break
    }
    case 'Tab': {
      if (currentIndex >= 0 && !editingCell.value) {
        event.preventDefault()
        const entry = filteredData.value[currentIndex]
        startEditingCell(entry, event.shiftKey ? 'value' : 'name')
      }
      break
    }
    case 'Escape': {
      selectedRowKey.value = null
      break
    }
    case 'c': {
      if ((event.ctrlKey || event.metaKey) && currentIndex >= 0) {
        event.preventDefault()
        copyEntry(filteredData.value[currentIndex])
      }
      break
    }
    case 'Delete':
    case 'Backspace': {
      if (currentIndex >= 0 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        openDeleteDialog(filteredData.value[currentIndex])
      }
      break
    }
  }
}

// 编辑时的 Tab 切换
function handleEditKeyDown(event: KeyboardEvent, entry: StorageEntry) {
  if (event.key === 'Tab') {
    event.preventDefault()
    const currentField = editingCell.value?.field
    if (currentField === 'name' && !event.shiftKey) {
      saveEditingCell()
      nextTick(() => startEditingCell(entry, 'value'))
    } else if (currentField === 'value' && event.shiftKey) {
      saveEditingCell()
      nextTick(() => startEditingCell(entry, 'name'))
    } else {
      saveEditingCell()
    }
  }
}

// 滚动到选中行
function scrollToSelectedRow() {
  nextTick(() => {
    const container = tableContainerRef.value
    if (!container)
      return
    const selectedRow = container.querySelector('[data-selected="true"]') as HTMLElement
    if (selectedRow) {
      selectedRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
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

async function handleAddEntry() {
  if (adding.value)
    return

  const key = newEntryKey.value.trim()
  if (!key) {
    showFeedback('请输入键名')
    return
  }

  const value = newEntryValue.value
  const nextEntry: StorageEntry = { name: key, value }

  adding.value = true
  const existingIndex = currentData.value.findIndex(entry => entry.name === key)
  const optimistic = [...currentData.value]
  if (existingIndex === -1)
    optimistic.unshift(nextEntry)
  else
    optimistic[existingIndex] = nextEntry
  currentData.value = optimistic

  try {
    const persisted = await persistStorageUpdate(key, nextEntry)
    if (!persisted) {
      showFeedback('保存失败，请重试')
      loadStorageData()
      return
    }

    showFeedback(existingIndex === -1 ? `已添加 ${key}` : `已更新 ${key}`)
    newEntryKey.value = ''
    newEntryValue.value = ''
  } catch (error) {
    console.warn('Add storage entry failed', error)
    showFeedback('保存失败，请重试')
    loadStorageData()
  } finally {
    adding.value = false
  }
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

  // 复制成功闪烁效果
  function showCopySuccess() {
    copiedRowKey.value = entry.name
    setTimeout(() => {
      copiedRowKey.value = null
    }, 600)
    showFeedback(successMessage)
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
      showCopySuccess()
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
    showCopySuccess()
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
  searchKey.value = ''
  loadStorageData()
}, { immediate: true })

watch(() => storeData.value.refreshToken, () => {
  loadStorageData()
})

watch(deleteDialogOpen, (isOpen) => {
  if (!isOpen)
    pendingDelete.value = null
})

// 清除选中状态当搜索变化时
watch(searchKey, () => {
  selectedRowKey.value = null
})
</script>

<template>
  <div class="relative flex h-full flex-col gap-1">
    <div
      v-if="feedbackMessage"
      class="pointer-events-none absolute right-2 top-2 z-20 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 shadow"
    >
      {{ feedbackMessage }}
    </div>
    <div class="flex-1 overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
      <div class="flex h-full flex-col">
        <div class="flex flex-col gap-1.5 border-b border-border/60 bg-card/70 px-2 py-1.5">
          <div class="flex items-center gap-1.5">
            <input
              v-model="newEntryKey"
              type="text"
              placeholder="键名"
              class="h-6 min-w-[100px] flex-1 rounded border border-border/60 bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              @keyup.enter.prevent="handleAddEntry"
            >
            <input
              v-model="newEntryValue"
              type="text"
              placeholder="值"
              class="h-6 flex-1 rounded border border-border/60 bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              @keyup.enter.prevent="handleAddEntry"
            >
            <Button
              size="xxs"
              :disabled="adding || !newEntryKey.trim()"
              class="shrink-0"
              @click="handleAddEntry"
            >
              <Plus class="h-3 w-3" />
              <span>{{ adding ? '…' : '添加' }}</span>
            </Button>
          </div>
          <input
            v-model="searchKey"
            type="search"
            placeholder="搜索键名..."
            class="h-6 w-full rounded border border-border/60 bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30"
            @keyup.esc.prevent="searchKey = ''"
          >
        </div>
        <div
          ref="tableContainerRef"
          class="flex-1 overflow-y-auto overflow-x-hidden outline-none"
          tabindex="0"
          @keydown="handleKeyDown"
          @click.capture="handleContainerClick"
        >
          <Table class="w-full table-fixed text-[11px]">
            <TableHeader class="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow class="text-[10px] uppercase tracking-wide text-muted-foreground">
                <TableHead class="w-[32%] py-1.5 pr-2">
                  键
                </TableHead>
                <TableHead class="py-1.5 pr-2">
                  值
                </TableHead>
                <TableHead class="w-[56px] py-1.5 text-right">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in filteredData"
                :key="item.name"
                :data-selected="selectedRowKey === item.name"
                class="group cursor-pointer select-none border-b border-border/60 transition"
                :class="[
                  selectedRowKey === item.name ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/40',
                  copiedRowKey === item.name ? 'animate-pulse bg-emerald-100 dark:bg-emerald-900/30' : '',
                ]"
                @click="selectRow(item)"
                @contextmenu.prevent="copyEntry(item, $event)"
              >
                <TableCell
                  class="py-1 pr-2 align-middle font-medium"
                  @click.stop="handleCellClick(item, 'name')"
                >
                  <template v-if="editingCell && editingCell.key === item.name && editingCell.field === 'name'">
                    <input
                      v-model="editingValue"
                      class="w-full rounded border border-primary/50 bg-background px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/50"
                      autofocus
                      @blur="saveEditingCell"
                      @keyup.enter.prevent="saveEditingCell"
                      @keyup.esc.prevent="cancelEditingCell"
                      @keydown="handleEditKeyDown($event, item)"
                    >
                  </template>
                  <template v-else>
                    <span class="block overflow-hidden text-ellipsis whitespace-nowrap">
                      {{ item.name }}
                    </span>
                  </template>
                </TableCell>
                <TableCell
                  class="py-1 pr-2 align-middle"
                  @click.stop="handleCellClick(item, 'value')"
                >
                  <template v-if="editingCell && editingCell.key === item.name && editingCell.field === 'value'">
                    <input
                      v-model="editingValue"
                      class="w-full rounded border border-primary/50 bg-background px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/50"
                      autofocus
                      @blur="saveEditingCell"
                      @keyup.enter.prevent="saveEditingCell"
                      @keyup.esc.prevent="cancelEditingCell"
                      @keydown="handleEditKeyDown($event, item)"
                    >
                  </template>
                  <template v-else>
                    <span class="block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground">
                      {{ item.value }}
                    </span>
                  </template>
                </TableCell>
                <TableCell class="py-1 align-middle text-right">
                  <div class="inline-flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      class="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition group-hover:opacity-100"
                      :class="[
                        selectedRowKey === item.name ? 'opacity-100' : '',
                        copiedRowKey === item.name ? 'text-emerald-600' : 'hover:bg-muted/60 hover:text-foreground',
                      ]"
                      @click.stop="copyEntry(item)"
                    >
                      <Check v-if="copiedRowKey === item.name" class="h-3 w-3" />
                      <Copy v-else class="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      class="flex h-5 w-5 items-center justify-center rounded text-destructive/70 opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      :class="selectedRowKey === item.name ? 'opacity-100' : ''"
                      @click.stop="openDeleteDialog(item)"
                    >
                      <Trash2 class="h-3 w-3" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="!filteredData.length">
                <TableCell colspan="3" class="py-6 text-center text-[11px] text-muted-foreground">
                  {{ currentData.length && searchKey.trim() ? '没有匹配的键名' : '暂无数据' }}
                </TableCell>
              </TableRow>
            </TableBody>
            <TableCaption v-if="filteredData.length" class="px-2 py-1.5 text-left text-[10px] text-muted-foreground">
              点击选中 · 再点编辑 · ↑↓ 导航 · ⌘C 复制
            </TableCaption>
          </Table>
        </div>
      </div>
    </div>
    <AlertDialog
      v-model:open="deleteDialogOpen"
      :title="pendingDelete ? `确认删除 ${pendingDelete.name}？` : '确认删除？'"
      description="删除后不可恢复"
      @ok="confirmDelete"
      @cancel="closeDeleteDialog"
    />
  </div>
</template>
