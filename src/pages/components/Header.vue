<script lang="ts" setup>
import { Globe, HardDrive, Languages, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toggleLocale } from '@/i18n'

const { t, locale } = useI18n()

const currentLocaleLabel = computed(() => locale.value === 'zh-CN' ? '中' : 'EN')

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
      <h1 class="flex items-center gap-1.5 text-sm font-semibold leading-tight">
        <HardDrive class="h-4 w-4 text-primary" />
        <span>Storage Manager</span>
      </h1>
      <p class="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Sparkles class="h-3 w-3 opacity-60" />
        {{ t('header.subtitle') }}
      </p>
    </div>
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class="flex h-6 items-center gap-1 rounded-full bg-secondary/80 px-2 text-[11px] font-medium text-secondary-foreground transition hover:bg-secondary"
        :title="t('header.switchLang')"
        @click="toggleLocale"
      >
        <Languages class="h-3.5 w-3.5" />
        <span>{{ currentLocaleLabel }}</span>
      </button>
      <span
        :title="currentHost"
        class="flex max-w-[160px] items-center gap-1 truncate rounded-full bg-secondary/80 px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
      >
        <Globe class="h-3.5 w-3.5 flex-shrink-0" />
        {{ currentHost || t('header.loading') }}
      </span>
    </div>
  </header>
</template>
