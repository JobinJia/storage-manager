<script lang="ts" setup>
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

async function handleSyncFromUrl() {
  if (syncing.value)
    return

  if (typeof chrome === 'undefined' || !chrome.tabs?.create || !chrome.tabs?.remove || !chrome.scripting?.executeScript) {
    showStatus('当前环境不支持同步')
    return
  }

  const targetUrl = normalizeUrl(syncUrl.value)
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
    const match = url.match(/^(?:[a-zA-Z][a-zA-Z\d+.-]*:\/\/)?([^\/@?#]+)/)
    return match?.[1] ?? ''
  }
}

const SYNC_URL_STORAGE_KEY = 'syncUrlByHost'

async function readSyncUrlMap() {
  return new Promise<Record<string, string>>((resolve) => {
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
      if (map && typeof map === 'object')
        resolve(map as Record<string, string>)
      else
        resolve({})
    })
  })
}

async function writeSyncUrlMap(map: Record<string, string>) {
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

async function initializeSyncUrl() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query)
    return

  try {
    const tab = await getActiveTab()
    const host = tab?.url ? extractHost(tab.url) : ''
    activeHost.value = host
    if (!host || !chrome.storage?.local)
      return

    const map = await readSyncUrlMap()
    const saved = map[host] ?? ''
    setSyncUrl(saved)
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

  const trimmed = syncUrl.value.trim()
  try {
    const map = await readSyncUrlMap()
    if (trimmed)
      map[activeHost.value] = trimmed
    else
      delete map[activeHost.value]

    await writeSyncUrlMap(map)
    setSyncUrl(trimmed)
    showStatus(trimmed ? '配置已保存' : '已清除配置')
  } catch (error) {
    console.warn('Save sync URL failed', error)
    showStatus('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  initializeSyncUrl()
})
</script>

<template>
  <section class="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/80 px-3 py-2 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
      <div class="flex flex-wrap items-center gap-1.5">
        <Label for="copy-mode-switch" class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          复制模式
        </Label>
        <Switch id="copy-mode-switch" v-model="copyType" class="scale-75" />
        <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {{ copyType ? 'JS 代码' : '值' }}
        </span>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
            >
              ?
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>`js代码`将会复制为storage.setItem(key, value)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-xs">
      <div class="flex min-w-[200px] flex-1 items-center gap-2">
        <Label for="sync-url-input" class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          指定同步 URL
        </Label>
        <input
          id="sync-url-input"
          v-model="syncUrl"
          type="text"
          placeholder="请输入页面 URL"
          class="flex-1 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
      </div>
      <div class="flex items-center gap-2">
        <Button
          size="sm"
          class="h-7 px-2 text-xs"
          :disabled="syncing || !syncUrl"
          @click="handleSyncFromUrl"
        >
          {{ syncing ? '同步中…' : '同步' }}
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="h-7 px-2 text-xs"
          :disabled="saving || !activeHost"
          @click="saveSyncUrlConfig"
        >
          {{ saving ? '保存中…' : '保存配置' }}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                ?
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>读取指定页面的 storage 并同步到当前页面</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <Button
        size="sm"
        variant="destructive"
        class="h-7 px-2 text-xs"
        :disabled="clearing"
        @click="openClearDialog"
      >
        {{ clearing ? '清除中…' : '清除全部' }}
      </Button>
      <p v-if="statusMessage" class="text-[11px] font-medium text-muted-foreground">
        {{ statusMessage }}
      </p>
    </div>

    <AlertDialog
      v-model:open="clearDialogOpen"
      title="确认清除全部？"
      description="将清空当前页面的 localStorage 与 sessionStorage"
      @ok="clearAllStorage"
      @cancel="closeClearDialog"
    />
  </section>
</template>
