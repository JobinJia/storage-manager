<script setup lang="ts">
import type { Component } from 'vue'
import { AlertTriangle, X } from 'lucide-vue-next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: Component
  iconClass?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}>(), {
  confirmText: '确认',
  cancelText: '取消',
  variant: 'default',
})

const emit = defineEmits<{
  (e: 'ok'): void
  (e: 'cancel'): void
}>()

const open = defineModel('open', {
  default: false,
  type: Boolean,
})

function updateOpen(value: boolean) {
  open.value = value
}

function handleCancel() {
  emit('cancel')
  open.value = false
}
</script>

<template>
  <AlertDialog :open="open" @update:open="updateOpen">
    <AlertDialogTrigger v-if="$slots.trigger">
      <slot name="trigger" />
    </AlertDialogTrigger>
    <AlertDialogContent class="max-w-85 gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl">
      <!-- Close Button -->
      <button
        type="button"
        class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
        @click="handleCancel"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">关闭</span>
      </button>

      <!-- Icon Section with Gradient Background -->
      <div
        :class="[
          'flex justify-center px-6 pb-2 pt-8',
          variant === 'destructive'
            ? 'bg-linear-to-b from-destructive/5 to-transparent'
            : 'bg-linear-to-b from-primary/5 to-transparent',
        ]"
      >
        <div
          :class="[
            'relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg',
            variant === 'destructive'
              ? 'bg-linear-to-br from-destructive/90 to-destructive text-white'
              : 'bg-linear-to-br from-primary/90 to-primary text-white',
          ]"
        >
          <!-- Decorative ring -->
          <div
            :class="[
              'absolute inset-0 rounded-2xl opacity-30',
              variant === 'destructive'
                ? 'ring-4 ring-destructive/20'
                : 'ring-4 ring-primary/20',
            ]"
          />
          <slot name="icon">
            <component
              :is="icon || AlertTriangle"
              :class="['h-7 w-7', iconClass]"
            />
          </slot>
        </div>
      </div>

      <!-- Content Section -->
      <AlertDialogHeader class="space-y-2 px-6 pb-4 pt-4 text-center">
        <AlertDialogTitle class="text-lg font-semibold tracking-tight">
          <slot name="title">
            {{ props.title }}
          </slot>
        </AlertDialogTitle>
        <AlertDialogDescription class="text-sm leading-relaxed text-muted-foreground">
          <slot name="description">
            {{ props.description }}
          </slot>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <!-- Actions Section -->
      <div class="flex gap-3 px-6 pb-6">
        <AlertDialogCancel
          class="mt-0 flex-1 rounded-xl border border-border/80 bg-muted/30 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted hover:shadow focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
          @click="emit('cancel')"
        >
          {{ cancelText }}
        </AlertDialogCancel>
        <AlertDialogAction
          :class="[
            'flex-1 rounded-xl py-2.5 text-sm font-medium text-white shadow-sm transition-all focus:ring-2 focus:ring-offset-0',
            variant === 'destructive'
              ? 'bg-destructive shadow-destructive/25 hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/30 focus:ring-destructive/30'
              : 'bg-primary shadow-primary/25 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 focus:ring-primary/30',
          ]"
          @click="emit('ok')"
        >
          {{ confirmText }}
        </AlertDialogAction>
      </div>
    </AlertDialogContent>
  </AlertDialog>
</template>
