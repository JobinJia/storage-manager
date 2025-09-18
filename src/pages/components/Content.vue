<script setup lang="ts">
import { ref, watch } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ContentList from './ContentList.vue'

const active = ref('localStorage')
</script>

<template>
  <Tabs v-model="active" class="w-full">
    <TabsList>
      <TabsTrigger value="localStorage">
        localStorage
      </TabsTrigger>
      <TabsTrigger value="sessionStorage">
        sessionStorage
      </TabsTrigger>
    </TabsList>
    <TabsContent value="localStorage">
      <ContentList type="localStorage" />
    </TabsContent>
    <TabsContent value="sessionStorage">
      <ContentList type="sessionStorage" />
    </TabsContent>
  </Tabs>
</template>
