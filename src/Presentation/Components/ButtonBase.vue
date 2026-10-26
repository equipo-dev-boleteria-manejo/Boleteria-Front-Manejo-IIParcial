<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    :class="[sizeClasses, variantClasses, fullWidth ? 'w-full' : '']"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <slot name="prefix" />
    <slot />
    <slot name="suffix" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
  fullWidth: false,
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-3 py-1.5 text-xs gap-1.5'
    case 'lg':
      return 'px-6 py-3.5 text-base gap-2.5'
    case 'md':
    default:
      return 'px-4 py-2.5 text-sm gap-2'
  }
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:bg-slate-300'
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200 active:bg-red-800'
    case 'success':
      return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 active:bg-emerald-800'
    case 'outline':
      return 'bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 active:bg-slate-100'
    case 'ghost':
      return 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900'
    case 'primary':
    default:
      return 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 active:bg-blue-800'
  }
})
</script>
