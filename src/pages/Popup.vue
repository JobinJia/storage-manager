<script lang="ts" setup>
import Content from './components/Content.vue'
import Header from './components/Header.vue'
import Settings from './components/Settings.vue'
</script>

<template>
  <div class="w-200 h-auto flex flex-col items-start">
    <Header />
    <Settings />
    <Content />
  </div>
</template>
