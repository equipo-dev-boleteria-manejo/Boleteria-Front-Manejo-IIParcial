<template>
  <div
    class="rounded-2xl bg-white border border-slate-200/80 shadow-sm transition-all overflow-hidden"
    :class="[paddingClass, hover ? 'hover:shadow-md hover:border-slate-300' : '']"
  >
    <div
      v-if="$slots.header || title"
      class="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between"
    >
      <slot name="header">
        <div>
          <h3 class="text-base font-bold text-slate-900">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5">{{ subtitle }}</p>
        </div>
      </slot>
      <slot name="header-action" />
    </div>

    <slot />

    <div
      v-if="$slots.footer"
      class="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-xs text-slate-500"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  subtitle?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  padding: 'md',
  hover: false,
})

const paddingClass = computed(() => {
  switch (props.padding) {
    case 'none':
      return 'p-0'
    case 'sm':
      return 'p-3.5 sm:p-4'
    case 'lg':
      return 'p-6 sm:p-8'
    case 'md':
    default:
      return 'p-5 sm:p-6'
  }
})
</script>
