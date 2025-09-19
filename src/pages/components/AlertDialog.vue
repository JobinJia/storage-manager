<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const props = defineProps<{
  // Define any props you want to pass to the AlertDialog component
  title?: string
  description?: string
}>()

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
</script>

<template>
  <AlertDialog :open="open" @update:open="updateOpen">
    <AlertDialogTrigger v-if="$slots.trigger">
      <slot name="trigger" />
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          <slot name="title">
            {{ props.title }}
          </slot>
        </AlertDialogTitle>
        <AlertDialogDescription>
          <slot name="description">
            {{ props.description }}
          </slot>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="emit('cancel')">
          取消
        </AlertDialogCancel>
        <AlertDialogAction @click="emit('ok')">
          确认
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
