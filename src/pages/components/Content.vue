<script setup lang="ts">
import { ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ContentList from './ContentList.vue'
import { Clock, Database } from 'lucide-vue-next'

const active = ref('localStorage')
</script>

<template>
  <Tabs v-model="active" class="flex h-full flex-col gap-1.5">
    <TabsList class="flex gap-1.5 rounded-md bg-muted/50 p-1 shadow-inner">
      <TabsTrigger value="localStorage" class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium">
        <Database class="h-3.5 w-3.5" />
        <span>localStorage</span>
      </TabsTrigger>
      <TabsTrigger value="sessionStorage" class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium">
        <Clock class="h-3.5 w-3.5" />
        <span>sessionStorage</span>
      </TabsTrigger>
    </TabsList>
    <TabsContent value="localStorage" class="flex-1 overflow-hidden focus-visible:outline-none">
      <ContentList type="localStorage" />
    </TabsContent>
    <TabsContent value="sessionStorage" class="flex-1 overflow-hidden focus-visible:outline-none">
      <ContentList type="sessionStorage" />
    </TabsContent>
  </Tabs>
</template>
