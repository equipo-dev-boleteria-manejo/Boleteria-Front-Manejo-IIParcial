<template>
  <article
    class="rounded-2xl border p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
    :class="variantClasses"
  >
    <div class="flex items-center justify-between gap-2" :class="headerColorClass">
      <span class="text-xs font-bold uppercase tracking-wide truncate">
        <slot name="title">{{ title }}</slot>
      </span>
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
        :class="iconContainerClasses"
        aria-hidden="true"
      >
        <slot name="icon">{{ icon }}</slot>
      </div>
    </div>

    <div class="mt-3">
      <div v-if="loading" class="h-8 w-20 animate-pulse rounded-lg bg-slate-200/70"></div>
      <p
        v-else
        class="text-3xl font-extrabold tracking-tight truncate"
        :class="valueColorClass"
      >
        <slot name="value">{{ value }}</slot>
      </p>

      <p
        v-if="description || $slots.description"
        class="text-[11px] mt-1 line-clamp-2"
        :class="descriptionColorClass"
      >
        <slot name="description">{{ description }}</slot>
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type MetricVariant = 'default' | 'success' | 'danger' | 'warning' | 'info'

interface Props {
  title?: string
  value?: string | number
  icon?: string
  description?: string
  variant?: MetricVariant
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  value: 0,
  icon: '📊',
  description: '',
  variant: 'default',
  loading: false,
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50/60'
    case 'danger':
      return 'border-rose-200 bg-rose-50/60'
    case 'warning':
      return 'border-amber-200 bg-amber-50/60'
    case 'info':
      return 'border-blue-200 bg-blue-50/60'
    case 'default':
    default:
      return 'border-slate-200 bg-white'
  }
})

const headerColorClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'text-emerald-800'
    case 'danger':
      return 'text-rose-800'
    case 'warning':
      return 'text-amber-800'
    case 'info':
      return 'text-blue-800'
    case 'default':
    default:
      return 'text-slate-500'
  }
})

const iconContainerClasses = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-emerald-100 text-emerald-800'
    case 'danger':
      return 'bg-rose-100 text-rose-800'
    case 'warning':
      return 'bg-amber-100 text-amber-800'
    case 'info':
      return 'bg-blue-100 text-blue-800'
    case 'default':
    default:
      return 'bg-slate-100 text-slate-700'
  }
})

const valueColorClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'text-emerald-700'
    case 'danger':
      return 'text-rose-700'
    case 'warning':
      return 'text-amber-700'
    case 'info':
      return 'text-blue-700'
    case 'default':
    default:
      return 'text-slate-900'
  }
})

const descriptionColorClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'text-emerald-700'
    case 'danger':
      return 'text-rose-700'
    case 'warning':
      return 'text-amber-700'
    case 'info':
      return 'text-blue-700'
    case 'default':
    default:
      return 'text-slate-400'
  }
})
</script>
