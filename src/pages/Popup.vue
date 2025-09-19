<script lang="ts" setup>
import Content from './components/Content.vue'
import Header from './components/Header.vue'
import Settings from './components/Settings.vue'
</script>

<template>
  <div class="flex h-[500px] w-[600px] flex-col overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-lg">
    <Header />
    <div class="flex flex-1 flex-col gap-2 px-3 py-2 overflow-hidden">
      <Settings />
      <div class="flex-1 overflow-hidden">
        <Content />
      </div>
    </div>
  </div>
</template>
