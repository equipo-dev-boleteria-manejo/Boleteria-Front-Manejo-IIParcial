<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-label="ariaLabel || label"
    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    :class="variantClasses"
    @click="$emit('click', $event)"
  >
    <!-- Spinner de carga -->
    <svg
      v-if="loading"
      class="animate-spin h-3.5 w-3.5 text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <!-- Ícono personalizado (opcional): reemplaza al predeterminado de la acción -->
    <slot v-else-if="$slots.icon" name="icon" />

    <!-- Ícono predeterminado según la acción -->
    <template v-else>
      <!-- Edit / Editar -->
      <svg
        v-if="action === 'edit'"
        class="h-3.5 w-3.5 text-slate-500"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>

      <!-- Danger / Desactivar / Eliminar -->
      <svg
        v-else-if="action === 'danger'"
        class="h-3.5 w-3.5 text-rose-600"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>

      <!-- Success / Activar -->
      <svg
        v-else-if="action === 'success'"
        class="h-3.5 w-3.5 text-emerald-600"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>

      <!-- Warning / Incidente -->
      <svg
        v-else-if="action === 'warning'"
        class="h-3.5 w-3.5 text-amber-600"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>

      <!-- Primary / Reactivar -->
      <svg
        v-else-if="action === 'primary'"
        class="h-3.5 w-3.5 text-blue-600"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </template>

    <span><slot>{{ computedLabel }}</slot></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type ActionButtonType = 'edit' | 'danger' | 'success' | 'warning' | 'primary'

interface Props {
  action?: ActionButtonType
  label?: string
  ariaLabel?: string
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  action: 'edit',
  label: '',
  ariaLabel: '',
  type: 'button',
  loading: false,
  disabled: false,
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const computedLabel = computed(() => {
  if (props.label) return props.label
  switch (props.action) {
    case 'danger':
      return 'Desactivar'
    case 'success':
      return 'Activar'
    case 'warning':
      return 'Incidente'
    case 'primary':
      return 'Reactivar'
    case 'edit':
    default:
      return 'Editar'
  }
})

const variantClasses = computed(() => {
  switch (props.action) {
    case 'danger':
      return 'border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-2xs'
    case 'success':
      return 'border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-2xs'
    case 'warning':
      return 'border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 shadow-2xs'
    case 'primary':
      return 'border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 shadow-2xs'
    case 'edit':
    default:
      return 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
  }
})
</script>
