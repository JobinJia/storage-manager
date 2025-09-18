<script lang="ts" setup>
import { ref } from 'vue'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const copyType = ref(false)
</script>

<template>
  <div class="size-auto flex p-4">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div class="flex items-center">
            <Label>复制模式：</Label>
            <Switch id="airplane-mode" v-model="copyType" class="ml-2" />
            <Label for="airplane-mode" class="ml-2">{{ copyType ? 'js代码' : '值' }}</Label>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>复制值关闭时, 将会复制为storage.setItem(key, value)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>
