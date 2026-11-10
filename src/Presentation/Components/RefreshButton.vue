<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none"
    @click="$emit('click', $event)"
  >
    <svg
      class="h-3.5 w-3.5 text-slate-500 transition-transform"
      :class="{ 'animate-spin text-blue-600': loading }"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>

    <span v-if="label || $slots.default">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  label?: string
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<Props>(), {
  label: 'Recargar',
  loading: false,
  disabled: false,
  type: 'button',
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>
