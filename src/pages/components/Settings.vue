<script lang="ts" setup>
import { ArrowDownToLine, Check, ChevronDown, Copy as CopyIcon, Info, Plus, Trash2 } from 'lucide-vue-next'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useStore } from '@/store'

import AlertDialog from './AlertDialog.vue'

const { storeData, setCopyType, setSyncUrl, triggerRefresh } = useStore()

const copyType = computed({
  get: () => storeData.value.copyType,
  set: value => setCopyType(value),
})

const syncUrl = computed({
  get: () => storeData.value.syncUrl,
  set: value => setSyncUrl(value),
})

const syncing = ref(false)
const clearing = ref(false)
const statusMessage = ref('')
const clearDialogOpen = ref(false)
const saving = ref(false)
const activeHost = ref('')
const urlDropdownOpen = ref(false)
let statusTimer: ReturnType<typeof window.setTimeout> | null = null

function showStatus(message: string, duration = 2000) {
  statusMessage.value = message
  if (statusTimer)
    window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => {
    statusMessage.value = ''
    statusTimer = null
  }, duration)
}

onBeforeUnmount(() => {
  if (statusTimer)
    window.clearTimeout(statusTimer)
})

function normalizeUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed)
    return ''
  try {
    return new URL(trimmed).toString()
  } catch (error) {
    try {
      return new URL(`https://${trimmed}`).toString()
    } catch {
      return ''
    }
  }
}

function waitForTabLoad(tabId: number) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('加载超时'))
    }, 15000)

    function listener(updatedTabId: number, info: any) {
      if (updatedTabId === tabId && info.status === 'complete') {
        cleanup()
        resolve()
      }
    }

    function cleanup() {
      chrome.tabs.onUpdated.removeListener(listener)
      window.clearTimeout(timeout)
    }

    chrome.tabs.onUpdated.addListener(listener)
  })
}

async function getActiveTab() {
  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
  })
  return tabs[0] ?? null
}

async function getActiveTabId() {
  const tab = await getActiveTab()
  return tab?.id ?? null
}

async function doSyncFromUrl(url: string) {
  if (syncing.value)
    return

  if (typeof chrome === 'undefined' || !chrome.tabs?.create || !chrome.tabs?.remove || !chrome.scripting?.executeScript) {
    showStatus('当前环境不支持同步')
    return
  }

  const targetUrl = normalizeUrl(url)
  if (!targetUrl) {
    showStatus('请输入有效的 URL')
    return
  }

  const activeTab = await getActiveTab()
  const activeTabId = activeTab?.id ?? null
  if (!activeTabId) {
    showStatus('未找到当前标签页')
    return
  }

  syncing.value = true
  showStatus('正在同步...', 8000)

  let tempTabId: number | null = null
  try {
    const tempTab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
      chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
        if (chrome.runtime.lastError || !tab?.id)
          reject(new Error(chrome.runtime.lastError?.message || '无法打开指定页面'))
        else
          resolve(tab)
      })
    })

    tempTabId = tempTab.id ?? null
    if (!tempTabId)
      throw new Error('无法打开指定页面')

    await waitForTabLoad(tempTabId)

    const remoteResults = await chrome.scripting.executeScript({
      target: { tabId: tempTabId },
      func: () => {
        const local: Array<[string, string]> = []
        const session: Array<[string, string]> = []

        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i)
          if (!key)
            continue
          const value = window.localStorage.getItem(key)
          local.push([key, value ?? ''])
        }

        for (let i = 0; i < window.sessionStorage.length; i += 1) {
          const key = window.sessionStorage.key(i)
          if (!key)
            continue
          const value = window.sessionStorage.getItem(key)
          session.push([key, value ?? ''])
        }

        return { local, session }
      },
      world: 'MAIN',
    }) as Array<{ result: { local: Array<[string, string]>, session: Array<[string, string]> } | undefined }>

    const entries = remoteResults[0]?.result
    if (!entries)
      throw new Error('未读取到远程数据')

    await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      args: [entries],
      func: ({ local, session }: { local: Array<[string, string]>, session: Array<[string, string]> }) => {
        try {
          window.localStorage.clear()
          for (const [key, value] of local)
            window.localStorage.setItem(key, value)
        } catch (error) {
          console.warn('Failed to apply localStorage entries', error)
        }

        try {
          window.sessionStorage.clear()
          for (const [key, value] of session)
            window.sessionStorage.setItem(key, value)
        } catch (error) {
          console.warn('Failed to apply sessionStorage entries', error)
        }
      },
      world: 'MAIN',
    })

    triggerRefresh()
    showStatus('同步完成')
  } catch (error) {
    console.warn('Sync from URL failed', error)
    showStatus('同步失败，请检查 URL 或权限')
  } finally {
    syncing.value = false
    if (tempTabId)
      chrome.tabs.remove(tempTabId, () => chrome.runtime.lastError)
  }
}

function handleSyncFromUrl() {
  return doSyncFromUrl(syncUrl.value)
}

async function clearAllStorage() {
  if (clearing.value)
    return

  clearDialogOpen.value = false

  if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.scripting?.executeScript) {
    showStatus('当前环境不支持清理')
    return
  }

  clearing.value = true
  showStatus('正在清除...', 4000)

  try {
    const activeTabId = await getActiveTabId()
    if (!activeTabId)
      throw new Error('未找到当前标签页')

    await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      func: () => {
        try {
          window.localStorage.clear()
        } catch (error) {
          console.warn('Failed to clear localStorage', error)
        }

        try {
          window.sessionStorage.clear()
        } catch (error) {
          console.warn('Failed to clear sessionStorage', error)
        }
      },
      world: 'MAIN',
    })

    triggerRefresh()
    showStatus('已清除全部')
  } catch (error) {
    console.warn('Clear storage failed', error)
    showStatus('清除失败，请重试')
  } finally {
    clearing.value = false
  }
}

function openClearDialog() {
  clearDialogOpen.value = true
}

function closeClearDialog() {
  clearDialogOpen.value = false
}

function extractHost(url: string) {
  try {
    return new URL(url).host
  } catch (error) {
    const match = url.match(/^(?:[a-z][a-z\d+.-]*:\/\/)?([^/@?#]+)/i)
    return match?.[1] ?? ''
  }
}

const SYNC_URL_STORAGE_KEY = 'syncUrlByHost'
const SELECTED_URL_STORAGE_KEY = 'selectedSyncUrlByHost'

type SyncUrlMap = Record<string, string[]>
type SelectedUrlMap = Record<string, string>

async function readSyncUrlMap() {
  return new Promise<SyncUrlMap>((resolve) => {
    if (!chrome.storage?.local) {
      resolve({})
      return
    }
    chrome.storage.local.get([SYNC_URL_STORAGE_KEY], (items) => {
      if (chrome.runtime?.lastError) {
        console.warn('Failed to read sync url map', chrome.runtime.lastError)
        resolve({})
        return
      }
      const map = items?.[SYNC_URL_STORAGE_KEY]
      if (map && typeof map === 'object') {
        // 兼容旧格式: { host: url } -> { host: [url] }
        const result: SyncUrlMap = {}
        for (const [host, value] of Object.entries(map)) {
          if (Array.isArray(value))
            result[host] = value
          else if (typeof value === 'string' && value.trim())
            result[host] = [value]
          else
            result[host] = []
        }
        resolve(result)
      } else {
        resolve({})
      }
    })
  })
}

async function writeSyncUrlMap(map: SyncUrlMap) {
  return new Promise<void>((resolve, reject) => {
    if (!chrome.storage?.local) {
      resolve()
      return
    }
    chrome.storage.local.set({ [SYNC_URL_STORAGE_KEY]: map }, () => {
      const error = chrome.runtime?.lastError
      if (error) {
        console.warn('Failed to write sync url map', error)
        reject(new Error(error.message))
        return
      }
      resolve()
    })
  })
}

async function readSelectedUrlMap() {
  return new Promise<SelectedUrlMap>((resolve) => {
    if (!chrome.storage?.local) {
      resolve({})
      return
    }
    chrome.storage.local.get([SELECTED_URL_STORAGE_KEY], (items) => {
      if (chrome.runtime?.lastError) {
        console.warn('Failed to read selected url map', chrome.runtime.lastError)
        resolve({})
        return
      }
      const map = items?.[SELECTED_URL_STORAGE_KEY]
      if (map && typeof map === 'object')
        resolve(map as SelectedUrlMap)
      else
        resolve({})
    })
  })
}

async function writeSelectedUrl(host: string, url: string) {
  return new Promise<void>((resolve, reject) => {
    if (!chrome.storage?.local) {
      resolve()
      return
    }
    readSelectedUrlMap().then((map) => {
      if (url)
        map[host] = url
      else
        delete map[host]

      chrome.storage.local.set({ [SELECTED_URL_STORAGE_KEY]: map }, () => {
        const error = chrome.runtime?.lastError
        if (error) {
          console.warn('Failed to write selected url', error)
          reject(new Error(error.message))
          return
        }
        resolve()
      })
    })
  })
}

const savedUrls = ref<string[]>([])
const newUrl = ref('')

async function initializeSyncUrl() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query)
    return

  try {
    const tab = await getActiveTab()
    const host = tab?.url ? extractHost(tab.url) : ''
    activeHost.value = host
    if (!host || !chrome.storage?.local)
      return

    const [map, selectedMap] = await Promise.all([
      readSyncUrlMap(),
      readSelectedUrlMap(),
    ])
    const urls = map[host] ?? []
    savedUrls.value = urls

    // 优先使用上次选中的 URL，否则使用第一个
    const selectedUrl = selectedMap[host]
    if (selectedUrl && urls.includes(selectedUrl))
      setSyncUrl(selectedUrl)
    else
      setSyncUrl(urls[0] ?? '')
  } catch (error) {
    console.warn('Failed to initialize sync url', error)
  }
}

async function saveSyncUrlConfig() {
  if (saving.value)
    return

  if (!activeHost.value) {
    showStatus('未识别当前页面')
    return
  }

  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    showStatus('当前环境不支持保存')
    return
  }

  saving.value = true

  const urlToSave = newUrl.value.trim()

  if (!urlToSave) {
    showStatus('请输入URL')
    saving.value = false
    return
  }

  const normalized = normalizeUrl(urlToSave)
  if (!normalized) {
    showStatus('请输入有效的URL')
    saving.value = false
    return
  }

  try {
    const map = await readSyncUrlMap()
    const urls = map[activeHost.value] ?? []

    // 检查是否已存在
    if (urls.includes(normalized)) {
      showStatus('URL已存在')
      saving.value = false
      return
    }

    // 添加到数组开头
    map[activeHost.value] = [normalized, ...urls]

    await writeSyncUrlMap(map)
    savedUrls.value = map[activeHost.value]
    setSyncUrl(normalized)
    // 保存选中状态
    await writeSelectedUrl(activeHost.value, normalized)
    newUrl.value = ''
    showStatus('配置已保存')
  } catch (error) {
    console.warn('Save sync URL failed', error)
    showStatus('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

async function selectUrl(url: string) {
  setSyncUrl(url)
  urlDropdownOpen.value = false
  // 保存选中状态
  if (activeHost.value) {
    try {
      await writeSelectedUrl(activeHost.value, url)
    } catch (error) {
      console.warn('Failed to save selected url', error)
    }
  }
}

async function deleteSyncUrlConfig(urlToDelete: string, event?: MouseEvent) {
  event?.stopPropagation()

  if (!activeHost.value) {
    showStatus('未识别当前页面')
    return
  }

  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    showStatus('当前环境不支持删除')
    return
  }

  const trimmed = urlToDelete.trim()
  if (!trimmed) {
    showStatus('请选择要删除的URL')
    return
  }

  try {
    const map = await readSyncUrlMap()
    const urls = map[activeHost.value] ?? []
    const filtered = urls.filter(u => u !== trimmed)

    if (filtered.length === urls.length) {
      showStatus('URL不存在')
      return
    }

    if (filtered.length > 0)
      map[activeHost.value] = filtered
    else
      delete map[activeHost.value]

    await writeSyncUrlMap(map)
    savedUrls.value = filtered
    // If deleted URL was selected, select the first remaining URL
    if (syncUrl.value === trimmed) {
      const newSelected = filtered[0] ?? ''
      setSyncUrl(newSelected)
      await writeSelectedUrl(activeHost.value, newSelected)
    }
    showStatus('已删除配置')
  } catch (error) {
    console.warn('Delete sync URL failed', error)
    showStatus('删除失败，请重试')
  }
}

onMounted(() => {
  initializeSyncUrl()
})
</script>

<template>
  <section class="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 py-2 shadow-sm">
    <!-- 第一行：复制模式 + 清除全部 -->
    <div class="flex items-center justify-between gap-2 text-xs">
      <div class="flex items-center gap-1.5">
        <Label
          for="copy-mode-switch"
          class="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          <CopyIcon class="h-3.5 w-3.5" />
          <span>复制模式</span>
        </Label>
        <Switch id="copy-mode-switch" v-model="copyType" class="scale-75" />
        <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {{ copyType ? 'JS' : '值' }}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
              >
                <Info class="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>JS 模式复制为 storage.setItem(key, value)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div class="flex items-center gap-2">
        <p v-if="statusMessage" class="text-[10px] font-medium text-muted-foreground">
          {{ statusMessage }}
        </p>
        <Button
          size="xxs"
          variant="destructive"
          :disabled="clearing"
          @click="openClearDialog"
        >
          <Trash2 class="h-3 w-3" />
          <span>{{ clearing ? '清除中…' : '清除全部' }}</span>
        </Button>
      </div>
    </div>

    <!-- 第二行：同步 URL 选择 -->
    <div class="flex items-center gap-1.5">
      <PopoverRoot v-model:open="urlDropdownOpen">
        <PopoverTrigger
          :disabled="savedUrls.length === 0"
          class="flex h-6 min-w-0 flex-1 items-center justify-between rounded border border-border/60 bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span class="truncate">{{ syncUrl || '暂无保存的 URL' }}</span>
          <ChevronDown class="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="bottom"
            align="start"
            :side-offset="4"
            class="z-50 max-h-[200px] min-w-[200px] overflow-y-auto rounded-md border border-border/60 bg-background p-1 shadow-md"
          >
            <div
              v-if="savedUrls.length === 0"
              class="px-2 py-1.5 text-xs text-muted-foreground"
            >
              暂无保存的 URL
            </div>
            <div
              v-for="url in savedUrls"
              :key="url"
              class="group flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-[11px] hover:bg-muted/60"
              @click="selectUrl(url)"
            >
              <Check
                class="h-3 w-3 shrink-0"
                :class="syncUrl === url ? 'opacity-100' : 'opacity-0'"
              />
              <span class="flex-1 truncate">{{ url }}</span>
              <button
                type="button"
                class="ml-1 shrink-0 rounded p-0.5 text-destructive opacity-0 transition hover:bg-destructive/10 group-hover:opacity-100"
                @click="deleteSyncUrlConfig(url, $event)"
              >
                <Trash2 class="h-3 w-3" />
              </button>
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <span class="shrink-0">
              <Button
                size="xxs"
                :disabled="syncing || !syncUrl"
                @click="handleSyncFromUrl"
              >
                <ArrowDownToLine class="h-3 w-3" />
                <span>{{ syncing ? '…' : '同步' }}</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>读取指定页面的 storage 并同步到当前页面</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- 第三行：添加新 URL -->
    <div class="flex items-center gap-1.5">
      <input
        id="sync-url-input"
        v-model="newUrl"
        type="text"
        placeholder="添加新的同步 URL"
        class="h-6 min-w-0 flex-1 rounded border border-border/60 bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30"
        @keyup.enter="saveSyncUrlConfig"
      >
      <Button
        size="xxs"
        :disabled="saving || !activeHost || !newUrl.trim()"
        class="shrink-0"
        @click="saveSyncUrlConfig"
      >
        <Plus class="h-3 w-3" />
        <span>{{ saving ? '…' : '添加' }}</span>
      </Button>
    </div>

    <AlertDialog
      v-model:open="clearDialogOpen"
      title="确认清除全部？"
      description="将清空当前页面的 localStorage 与 sessionStorage，此操作不可恢复"
      variant="destructive"
      confirm-text="清除"
      @ok="clearAllStorage"
      @cancel="closeClearDialog"
    />
  </section>
</template>
