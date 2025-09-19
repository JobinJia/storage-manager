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
  <div class="w-full h-auto flex flex-row items-center justify-between px-2 py-1 border-b border-b-border">
    <h4 class="font-bold text-sm">
      Storage Manager
    </h4>
    <span>{{ currentHost }}</span>
  </div>
</template>
