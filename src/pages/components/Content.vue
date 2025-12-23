<script setup lang="ts">
import { Clock, Database } from 'lucide-vue-next'
import { ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ContentList from './ContentList.vue'

const active = ref('localStorage')
</script>

<template>
  <Tabs v-model="active" :unmount-on-hide="false" class="flex h-full flex-col gap-1">
    <TabsList class="flex gap-1 rounded bg-muted/50 p-0.5">
      <TabsTrigger value="localStorage" class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium">
        <Database class="h-3 w-3" />
        <span>localStorage</span>
      </TabsTrigger>
      <TabsTrigger value="sessionStorage" class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium">
        <Clock class="h-3 w-3" />
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
