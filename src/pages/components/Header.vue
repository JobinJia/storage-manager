<script lang="ts" setup>
import { onMounted, ref } from 'vue'

const currentUrl = ref('')

function updateCurrentUrl() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query)
    return

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url
    if (url)
      currentUrl.value = url
  })
}

onMounted(updateCurrentUrl)
</script>

<template>
  <div class="size-[100%] flex flex-row items-center justify-between px-2 py-1 border-b border-b-border">
    <h4>Storage Manager</h4>
    <span>{{ currentUrl }}</span>
  </div>
</template>
