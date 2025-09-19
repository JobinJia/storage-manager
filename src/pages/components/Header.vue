<script lang="ts" setup>
import { onMounted, ref } from 'vue'

const currentHost = ref('')

function extractHost(url: string) {
  try {
    const { hostname } = new URL(url)
    return hostname
  } catch (error) {
    const match = url.match(/^(?:[a-z][a-z\d+.-]*:\/\/)?([^/@?#]+)/i)
    return match?.[1] ?? ''
  }
}

function updateCurrentUrl() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query)
    return

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url
    if (url) {
      const host = extractHost(url)
      currentHost.value = host || url
    }
  })
}

onMounted(updateCurrentUrl)
</script>

<template>
  <header class="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
    <div class="flex flex-col">
      <h1 class="text-sm font-semibold leading-tight">
        Storage Manager
      </h1>
      <p class="text-[11px] text-muted-foreground">
        快速查看并管理当前标签页的存储
      </p>
    </div>
    <span
      :title="currentHost"
      class="max-w-[200px] truncate rounded-full bg-secondary/80 px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
    >
      {{ currentHost || '加载中…' }}
    </span>
  </header>
</template>
