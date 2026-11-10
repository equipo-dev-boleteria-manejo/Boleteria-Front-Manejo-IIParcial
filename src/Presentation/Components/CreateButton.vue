<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin h-3.5 w-3.5 text-white"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <svg
      v-else
      class="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
    </svg>

    <span><slot>{{ label }}</slot></span>
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
  label: 'Crear',
  loading: false,
  disabled: false,
  type: 'button',
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>
